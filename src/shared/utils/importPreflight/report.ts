import type {
  ExistingWorkMatch,
  ExistingWorkMatchesByIdentifier,
  ImportDuplicateBasis,
  ImportDuplicateFinding,
  ImportPlan,
  ImportPreflightReport,
  ImportPreflightSummary,
  ImportReportWork,
} from '@/src/shared/types';
import { getDisplayTitle } from '@/src/shared/utils/work';

import { collectWorkIdentifiers, importIdentifierKey } from './identifiers';

/**
 * Builds the report shown at the confirmation boundary from a final plan and whatever the
 * existing-work lookups found.
 *
 * Pure: same plan and same matches, same report, with no React, no GraphQL and no clock in it.
 * That is what makes the interesting cases — an identifier on two imported works, an identifier
 * on several existing ones, an identifier on both — testable as data rather than through a
 * rendered preview.
 */

/** DOI before ISBN, so a work's stronger, work-level signal is read first. */
const BASIS_ORDER: Record<ImportDuplicateBasis, number> = { doi: 0, isbn: 1 };

/** Codepoint order. Deliberately not `localeCompare`, whose result depends on the locale. */
const compareStrings = (a: string, b: string): number => (a === b ? 0 : a < b ? -1 : 1);

/**
 * Existing matches keep every work an identifier reached, minus repeats.
 *
 * One existing work can hold the same ISBN on two publication records, and it should still be
 * one work in the finding. Repeats are dropped by `workId`; distinct works are all kept, because
 * an identifier reaching several existing works is precisely what the report exists to show.
 */
const dedupeExistingByWorkId = (matches: ExistingWorkMatch[]): ExistingWorkMatch[] => {
  const byWorkId = new Map<string, ExistingWorkMatch>();

  matches.forEach((match) => {
    if (!byWorkId.has(match.workId)) byWorkId.set(match.workId, match);
  });

  return [...byWorkId.values()].sort((a, b) => compareStrings(a.title, b.title) || compareStrings(a.workId, b.workId));
};

type FindingDraft = {
  basis: ImportDuplicateBasis;
  value: string;
  importedWorks: ImportReportWork[];
  /** Position of the first planned work carrying this identifier, for ordering. */
  firstImportIndex: number;
};

export const buildImportPreflightReport = (
  plan: ImportPlan,
  existingMatches: ExistingWorkMatchesByIdentifier,
): ImportPreflightReport => {
  const drafts = new Map<string, FindingDraft>();

  let worksWithDoi = 0;
  let worksWithIsbn = 0;
  let worksWithAnyCheckedIdentifier = 0;

  // Works are visited in plan order, so each draft's `importedWorks` comes out in source order
  // without a later sort, and the first work to reach an identifier fixes its position.
  plan.works.forEach((work, importIndex) => {
    const identifiers = collectWorkIdentifiers(work);

    if (identifiers.some(({ basis }) => basis === 'doi')) worksWithDoi += 1;
    if (identifiers.some(({ basis }) => basis === 'isbn')) worksWithIsbn += 1;
    if (identifiers.length > 0) worksWithAnyCheckedIdentifier += 1;

    const reportWork: ImportReportWork = {
      workId: work.id,
      importIndex,
      title: getDisplayTitle(work.titles).title,
    };

    identifiers.forEach((identifier) => {
      const key = importIdentifierKey(identifier);
      const draft = drafts.get(key);

      if (draft) {
        draft.importedWorks.push(reportWork);

        return;
      }

      drafts.set(key, {
        basis: identifier.basis,
        value: identifier.value,
        importedWorks: [reportWork],
        firstImportIndex: importIndex,
      });
    });
  });

  // A signal is either several planned works sharing an identifier, or a planned work sharing one
  // with something already in Thoth. A single planned work with an identifier nothing else
  // carries is just a work.
  const duplicateFindings: ImportDuplicateFinding[] = [...drafts.entries()]
    .map(([key, draft]) => ({
      draft,
      existingWorks: dedupeExistingByWorkId(existingMatches.get(key) ?? []),
    }))
    .filter(({ draft, existingWorks }) => draft.importedWorks.length > 1 || existingWorks.length > 0)
    .sort(
      (a, b) =>
        a.draft.firstImportIndex - b.draft.firstImportIndex ||
        BASIS_ORDER[a.draft.basis] - BASIS_ORDER[b.draft.basis] ||
        compareStrings(a.draft.value, b.draft.value),
    )
    .map(({ draft, existingWorks }) => ({
      basis: draft.basis,
      value: draft.value,
      importedWorks: draft.importedWorks,
      existingWorks,
    }));

  const affectedWorkIds = new Set(
    duplicateFindings.flatMap(({ importedWorks }) => importedWorks.map(({ workId }) => workId)),
  );

  const summary: ImportPreflightSummary = {
    works: plan.works.length,
    chapters: plan.chapters.length,
    existingSeries: plan.series.filter(({ target }) => target.kind === 'existing').length,
    proposedSeries: plan.series.filter(({ target }) => target.kind === 'proposed').length,
    worksWithDoi,
    worksWithIsbn,
    worksWithAnyCheckedIdentifier,
    worksWithoutCheckedIdentifier: plan.works.length - worksWithAnyCheckedIdentifier,
    affectedWorks: affectedWorkIds.size,
    duplicateFindings: duplicateFindings.length,
  };

  return { summary, duplicateFindings };
};
