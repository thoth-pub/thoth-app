import { LocationPlatform, WorkStatus } from '@/gql/graphql';
import { ContributorTypes, languageOptions } from '@/src/shared/constants';

import { appConfig } from '../../config';
import { workStatusValidation } from '../../utils/validations';
import { isCsvBulkImportBlockedStatus } from '../../utils/work';
import { canonicalImportOrcid } from '../importLookupCoordinator';
import type { TranslateFunction } from './CSVParser';
import {
  type CsvPreflightContext,
  type CsvRowPreflightFinding,
  csvWorkTypeKind,
  hasUnsafeBoundary,
  isRefusedThothUrl,
  isStrictIsoDate,
  passesCsvOrcidRule,
  readCsvWholeNumber,
  withoutBoundaryDefect,
} from './csvPreflight';
import { CSV_KEYS, type CsvFieldKey, type CsvRow, csvSchema, getContributorFieldsByIndex } from './csvSchema';

/**
 * The cross-cell backend-parity rules of the CSV preflight (APP-IMPORT-CSV-PARITY-01, thoth-app#320).
 *
 * Each rule mirrors one backend rule that a CSV file can break and that `bulkCreateWorks` would otherwise meet only
 * partway through an import, after earlier rows and usually the row's own Work were written. Each refuses exactly what
 * the cited backend rule refuses, judged on the value the import would send, and never a value the backend accepts
 * (the one accepted narrowing is R-7's, stated there). None of them owns the rule: the backend does, and its source is
 * named beside each.
 *
 * Every rule reads canonical cells and skips a cell another rule has already rejected, so one correction yields one
 * finding. The one exception is the PDF location rules, which read only whether the PDF ISBN and the location cells
 * are empty: correcting a rejected ISBN or platform would not resolve their findings.
 *
 * The rules run after the per-cell preflight loop, in this order: R-4, R-5, R-6, R-7, R-10, R-11, R-12, R-13.
 */

/**
 * The edition a non-chapter row with a blank `edition` is planned with (R-4): the value the Work mapper's
 * `edition ?? 1`, the Work form's default and the ONIX importer already give a Work that states none.
 */
export const CSV_DEFAULT_EDITION = 1;

/**
 * Whether a contributor slot names someone, by the row parser's own test: `first_name + ' ' + last_name` longer than
 * one character. The parser plans exactly the slots this accepts, and the contributor rules read exactly those.
 */
export const isNamedCsvContributor = (firstName: string, lastName: string): boolean =>
  `${firstName} ${lastName}`.length > 1;

/** Whether any of a row's three PDF location cells is filled, as the row parser decides to plan a location. */
export const isCsvPdfLocationFilled = (landingPage: string, fullTextUrl: string, platform: string): boolean =>
  landingPage.length !== 0 || fullTextUrl.length !== 0 || platform.length !== 0;

/* ------------------------------------------------------------------------------------------------ */
/* R-5: lifecycle dates                                                                             */
/* ------------------------------------------------------------------------------------------------ */

/**
 * One date as the lifecycle rule reads it: a valid `YYYY-MM-DD` date, `null` when the cell is empty, or `undefined`
 * when another rule has rejected the cell, so that no case reading it can be decided.
 */
export type CsvLifecycleDate = string | null | undefined;

export type CsvLifecycleProblem =
  | 'publicationDateRequired'
  | 'withdrawnDateNotAllowed'
  | 'withdrawnDateRequired'
  | 'withdrawnDateNotAfterPublication';

/** `WorkProperties::is_published` (thoth `work/mod.rs`). */
const isPublishedStatus = (status: WorkStatus): boolean =>
  status === WorkStatus.Active || status === WorkStatus.Withdrawn || status === WorkStatus.Superseded;

/** `WorkProperties::is_out_of_print` (thoth `work/mod.rs`). */
const isOutOfPrintStatus = (status: WorkStatus): boolean =>
  status === WorkStatus.Withdrawn || status === WorkStatus.Superseded;

/**
 * The first lifecycle rule a Work's status and dates break, in `WorkProperties::validate`'s order (thoth
 * `work/mod.rs`, reached through `WorkPolicy::can_create`), or `undefined`:
 *
 * 1. a published status with no publication date (`PublicationDateError`, `work_active_publication_date_check`);
 * 2. a withdrawn date on a status that is neither Withdrawn nor Superseded (`WithdrawnDateError`,
 *    `work_active_withdrawn_date_check`);
 * 3. Withdrawn or Superseded with no withdrawn date (`NoWithdrawnDateError`, `work_inactive_no_withdrawn_date_check`);
 * 4. a withdrawn date that is not after the publication date. Rust refuses one before it
 *    (`WithdrawnDateBeforePublicationDateError`); the database also refuses an equal one
 *    (`work_withdrawn_date_after_publication_date_check`). Valid ISO dates compare as strings.
 *
 * A case that reads a date given as `undefined` is not decided, and the next case is asked.
 */
export const checkCsvWorkLifecycle = (
  status: WorkStatus,
  publicationDate: CsvLifecycleDate,
  withdrawnDate: CsvLifecycleDate,
): CsvLifecycleProblem | undefined => {
  if (publicationDate === null && isPublishedStatus(status)) return 'publicationDateRequired';

  if (typeof withdrawnDate === 'string' && !isOutOfPrintStatus(status)) return 'withdrawnDateNotAllowed';

  if (withdrawnDate === null && isOutOfPrintStatus(status)) return 'withdrawnDateRequired';

  if (typeof publicationDate === 'string' && typeof withdrawnDate === 'string' && !(withdrawnDate > publicationDate)) {
    return 'withdrawnDateNotAfterPublication';
  }

  return undefined;
};

/** A date cell as the lifecycle rule reads it: valid only when non-empty, free of boundary defects and strict ISO. */
const readLifecycleDate = (value: string): CsvLifecycleDate => {
  if (value.length === 0) return null;

  return !hasUnsafeBoundary(value) && isStrictIsoDate(value) ? value : undefined;
};

/**
 * R-5. Only a row whose status the import would execute: a Thoth status that APP-CSV-D11-A does not block. Under
 * D11-A only case 2 is reachable from a file.
 */
const collectLifecycleFindings = (row: CsvRow, rowNumber: number, t: TranslateFunction): CsvRowPreflightFinding[] => {
  const status = row[CSV_KEYS.WORK_STATUS];
  const parsed = workStatusValidation.safeParse(status);

  if (!parsed.success || isCsvBulkImportBlockedStatus(status)) return [];

  const publicationDate = readLifecycleDate(row[CSV_KEYS.PUBLICATION_DATE]);
  const withdrawnDate = readLifecycleDate(row[CSV_KEYS.WITHDRAWN_DATE]);
  const problem = checkCsvWorkLifecycle(parsed.data, publicationDate, withdrawnDate);

  switch (problem) {
    case undefined:
      return [];
    case 'publicationDateRequired':
      return [{ message: t('errors.csvPublicationDateRequired', { row: rowNumber, status }) }];
    case 'withdrawnDateNotAllowed':
      return [{ message: t('errors.csvWithdrawnDateNotAllowed', { row: rowNumber, status }) }];
    case 'withdrawnDateRequired':
      return [{ message: t('errors.csvWithdrawnDateRequired', { row: rowNumber, status }) }];
    case 'withdrawnDateNotAfterPublication':
      return [
        {
          message: t('errors.csvWithdrawnDateNotAfterPublication', {
            withdrawn: withdrawnDate,
            row: rowNumber,
            published: publicationDate,
          }),
        },
      ];
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* R-4: edition                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/**
 * R-4: `work_edition_check` (`edition > 0`, thoth `up.sql:3267`) on a non-chapter row. A blank edition is not a
 * finding: it is planned as {@link CSV_DEFAULT_EDITION}, which `work_non_chapter_has_edition` needs. A Book Chapter
 * sends no edition, and an edition the whole-number rule rejects is already reported.
 */
const collectEditionFindings = (row: CsvRow, rowNumber: number, t: TranslateFunction): CsvRowPreflightFinding[] => {
  if (csvWorkTypeKind(row[CSV_KEYS.WORK_TYPE]) !== 'nonChapter') return [];

  const value = row[CSV_KEYS.EDITION];
  const edition = readCsvWholeNumber(value);

  return edition.kind === 'number' && edition.value < 1
    ? [{ message: t('errors.csvEditionNotPositive', { value, row: rowNumber }) }]
    : [];
};

/* ------------------------------------------------------------------------------------------------ */
/* R-6 and R-7: contributor slots                                                                   */
/* ------------------------------------------------------------------------------------------------ */

type ContributorSlot = {
  slot: number;
  /** Named by the parser's test, and still named once each name cell's boundary defect is removed. */
  cleanlyNamed: boolean;
  role: string;
  orcid: string;
};

const readContributorSlots = (row: CsvRow): ContributorSlot[] =>
  Array.from({ length: appConfig.maxCsvContributorsCount }, (_, offset) => {
    const slot = offset + 1;
    const { FIRST_NAME, LAST_NAME, ROLE, ORCID } = getContributorFieldsByIndex(slot);
    const firstName = row[FIRST_NAME];
    const lastName = row[LAST_NAME];

    return {
      slot,
      cleanlyNamed:
        isNamedCsvContributor(firstName, lastName) &&
        isNamedCsvContributor(withoutBoundaryDefect(firstName), withoutBoundaryDefect(lastName)),
      role: row[ROLE],
      orcid: row[ORCID],
    };
  });

/**
 * R-6: `NewContribution.contributionType` is a non-null enum. A named slot whose role is empty once trimmed would be
 * planned and sent as it is, and refused after the Work exists. A non-empty role the validator rejects is the
 * validator's to report.
 */
const collectRoleFindings = (
  slots: readonly ContributorSlot[],
  rowNumber: number,
  t: TranslateFunction,
): CsvRowPreflightFinding[] =>
  slots
    .filter(({ cleanlyNamed, role }) => cleanlyNamed && role.trim().length === 0)
    .map(({ slot }) => ({ message: t('errors.csvContributorRoleRequired', { slot, row: rowNumber }) }));

/**
 * R-7: `contribution_work_id_contributor_id_contribution_type_uniq` (thoth `up.sql:3548`). Two named slots with the
 * same ORCID identity (`canonicalImportOrcid`, the key the import registry and the lookup both use) and the same role
 * become one contributor with that role twice, and the second contribution is refused after the Work exists. The same
 * person in two roles is accepted.
 *
 * Accepted narrowing: when the ORCID is not yet in Thoth, a user could pick two different existing contributors for
 * the two slots, which the backend would accept. The file still states one person twice in one role, so it is
 * refused.
 */
const collectRepeatedContributorFindings = (
  slots: readonly ContributorSlot[],
  rowNumber: number,
  t: TranslateFunction,
): CsvRowPreflightFinding[] => {
  const groups = new Map<string, { orcid: string; role: string; slots: number[] }>();

  for (const { slot, cleanlyNamed, role, orcid } of slots) {
    if (!cleanlyNamed) continue;
    if (role.length === 0 || !ContributorTypes.safeParse(role).success) continue;
    if (orcid.length === 0 || hasUnsafeBoundary(orcid) || !passesCsvOrcidRule(orcid)) continue;

    const identity = canonicalImportOrcid(orcid);

    if (identity === null) continue;

    const key = JSON.stringify([identity, role]);
    const group = groups.get(key);

    if (group) group.slots.push(slot);
    else groups.set(key, { orcid, role, slots: [slot] });
  }

  return [...groups.values()]
    .filter((group) => group.slots.length > 1)
    .map(({ orcid, role, slots: repeated }) => ({
      message: t('errors.csvContributorRepeated', { row: rowNumber, orcid, role, slots: repeated.join(', ') }),
    }));
};

/* ------------------------------------------------------------------------------------------------ */
/* R-10 to R-12: the PDF location                                                                   */
/* ------------------------------------------------------------------------------------------------ */

const headerOf = (key: CsvFieldKey): string => csvSchema.find((field) => field.key === key)?.header ?? key;

/**
 * R-10 to R-12, on a non-chapter row that plans a PDF location: a PDF ISBN that is not blank once trimmed, and any
 * location cell filled. They read only whether those cells are empty, so a rejected ISBN or platform does not hide a
 * location finding that correcting it would not resolve.
 *
 * - R-10: a digital publication's canonical location needs both URLs (`LocationPolicy::can_create` ->
 *   `canonical_record_complete`, `LocationUrlError`, thoth `location/policy.rs`, `location/crud.rs`), and each URL
 *   sent must have the shape of `location_landing_page_check` and `location_full_text_url_check` (`up.sql:2900-2901`).
 * - R-11: `NewLocation.locationPlatform` is a non-null enum, so a blank platform is refused. Required rather than
 *   defaulted: a default would state a platform the file does not.
 * - R-12: only a superuser may create a THOTH location (`ThothLocationError`, thoth `location/policy.rs`). Said only
 *   when the context knows the user is not one. A platform the validator rejects is the validator's to report.
 */
const collectPdfLocationFindings = (
  row: CsvRow,
  rowNumber: number,
  t: TranslateFunction,
  context: CsvPreflightContext,
): CsvRowPreflightFinding[] => {
  const landingPage = row[CSV_KEYS.PUBLICATION_PDF_LOCATION_LANDING_PAGE];
  const fullTextUrl = row[CSV_KEYS.PUBLICATION_PDF_LOCATION_FULL_TEXT_URL];
  const platform = row[CSV_KEYS.PUBLICATION_PDF_LOCATION_PLATFORM];

  if (csvWorkTypeKind(row[CSV_KEYS.WORK_TYPE]) !== 'nonChapter') return [];
  if (row[CSV_KEYS.PUBLICATION_PDF_ISBN].trim().length === 0) return [];
  if (!isCsvPdfLocationFilled(landingPage, fullTextUrl, platform)) return [];

  const findings: CsvRowPreflightFinding[] = [];

  if (landingPage.trim().length === 0 || fullTextUrl.trim().length === 0) {
    findings.push({ message: t('errors.csvPdfLocationIncomplete', { row: rowNumber }) });
  }

  for (const key of [CSV_KEYS.PUBLICATION_PDF_LOCATION_LANDING_PAGE, CSV_KEYS.PUBLICATION_PDF_LOCATION_FULL_TEXT_URL]) {
    const value = row[key];

    if (isRefusedThothUrl(value)) {
      findings.push({
        message: t('errors.csvUrlNotValid', { field: headerOf(key), value: value.trim(), row: rowNumber }),
      });
    }
  }

  if (platform.trim().length === 0) {
    findings.push({ message: t('errors.csvPdfLocationPlatformRequired', { row: rowNumber }) });
  }

  if (platform === LocationPlatform.Thoth && context.isSuperuser === false) {
    findings.push({ message: t('errors.csvPdfLocationThothPlatform', { row: rowNumber }) });
  }

  return findings;
};

/* ------------------------------------------------------------------------------------------------ */
/* R-13: languages                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

const LANGUAGE_KEYS = [
  CSV_KEYS.ORIGINAL_LANGUAGE,
  CSV_KEYS.TRANSLATED_FROM_LANGUAGE,
  CSV_KEYS.TRANSLATED_INTO_LANGUAGE,
] as const;

/**
 * R-13: `language_uniq_work_idx (work_id, language_code)` (thoth `up.sql:4478`). A code in two or three of a row's
 * language cells is planned once per cell, and every `createLanguage` after the first is refused after the Work
 * exists. Only cells holding a valid language are compared; any other is the validator's or the boundary rule's.
 */
const collectRepeatedLanguageFindings = (
  row: CsvRow,
  rowNumber: number,
  t: TranslateFunction,
): CsvRowPreflightFinding[] => {
  const cells = new Map<string, string[]>();

  for (const key of LANGUAGE_KEYS) {
    const code = row[key];

    if (code.length === 0 || hasUnsafeBoundary(code)) continue;
    if (!languageOptions.some((option) => option.value === code)) continue;

    cells.set(code, [...(cells.get(code) ?? []), headerOf(key)]);
  }

  return [...cells.entries()]
    .filter(([, fields]) => fields.length > 1)
    .map(([code, fields]) => ({
      message: t('errors.csvLanguageRepeated', { row: rowNumber, code, fields: fields.join(', ') }),
    }));
};

/**
 * Every cross-cell backend-parity finding for one canonical row, in rule order (R-4, R-5, R-6, R-7, R-10, R-11, R-12,
 * R-13). The parser reports them after the row's per-cell findings.
 */
export const collectCsvBackendParityFindings = (
  row: CsvRow,
  rowNumber: number,
  t: TranslateFunction,
  context: CsvPreflightContext,
): CsvRowPreflightFinding[] => {
  const slots = readContributorSlots(row);

  return [
    ...collectEditionFindings(row, rowNumber, t),
    ...collectLifecycleFindings(row, rowNumber, t),
    ...collectRoleFindings(slots, rowNumber, t),
    ...collectRepeatedContributorFindings(slots, rowNumber, t),
    ...collectPdfLocationFindings(row, rowNumber, t, context),
    ...collectRepeatedLanguageFindings(row, rowNumber, t),
  ];
};
