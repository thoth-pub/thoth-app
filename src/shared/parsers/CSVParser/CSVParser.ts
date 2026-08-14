import CSVFileValidator, { type ValidatorConfig } from 'csv-file-validator';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

import { ContributionType, CurrencyCode, LanguageCode, LocaleCode, LocationPlatform } from '@/gql/graphql';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { SubjectEntity } from '@/src/entities/subject/model/subject.types';
import { WorkEntity, WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import {
  getDefaultAffiliation,
  getDefaultContribution,
  LanguageRelation,
  PublicationType,
  SubjectTypes,
} from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { ERRORS } from '../../constants/errors';
import { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ContributorsForSelection,
  ImportIssue,
  ImportParseResult,
  SeriesImportPlan,
  TitleEntity,
} from '../../types';
import {
  convertRomanToArabic,
  getDefaultAbstract,
  getDefaultPublication,
  getDefaultTitle,
  getDefaultWork,
} from '../../utils';
import { createEmptyImportPlan } from '../../utils/importPlan';
import { compileFullTitle } from '../../utils/titles';
import { ImportLookupCoordinator } from '../importLookupCoordinator';
import { importStatus, sortIssues } from '../issues/importIssues';
import {
  buildSeriesPlan,
  resolveSeriesCandidate,
  type SeriesCandidate,
  type SeriesPlanMessages,
} from '../series/seriesPlan';
import { collectRowPreflightFindings, toCanonicalCsvValue } from './csvPreflight';
import {
  CSV_KEYS,
  type CsvFieldKey,
  type CsvRow,
  csvSchema,
  type CsvValidatorRow,
  getContributorFieldsByIndex,
  normaliseCsvHeader,
} from './csvSchema';
import { toValidatorIssues } from './validatorIssues';

export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

/**
 * The largest issue ordinal Thoth can store: `issueOrdinal` is a GraphQL `Int`, which the
 * specification fixes at a signed 32-bit integer.
 */
const MAX_ISSUE_ORDINAL = 2147483647;

/** What {@link CSVParser.parseRow} produces for one CSV row. */
type ParsedRow = {
  work: WorkEntity;
  contributorsForSelection: ContributorsForSelection;
  seriesCandidate?: SeriesCandidate;
};

export class CSVParser {
  private csv: File;
  private csvConfig: ValidatorConfig;
  /**
   * Issues carry the row they came from because rows are parsed concurrently: without it the
   * order shown in the UI would depend on which row's contributor and institution lookups
   * happened to finish first. The row is not optional — see {@link CSVParser.pushIssue}.
   */
  private issues: ImportIssue[] = [];
  private parsedWorks: WorkEntity[] = [];
  private parsedSeries: SeriesImportPlan = [];
  private contributorsForSelection: ContributorsForSelection = {};
  private imprints: FormFieldOption[] = [];
  private licenses: FormFieldOption[] = [];
  private serieses: SeriesEntity[] = [];
  private defaultId: string = appConfig.defaultId;
  private readonly lookupCoordinator: ImportLookupCoordinator;
  private t: TranslateFunction;

  constructor(
    csv: File,
    csvConfig: ValidatorConfig,
    imprints: FormFieldOption[],
    licenses: FormFieldOption[],
    serieses: SeriesEntity[],
    contributorService: ContributorService,
    institutionService: InstitutionService,
    t: TranslateFunction,
  ) {
    this.csv = csv;
    this.csvConfig = csvConfig;
    this.imprints = imprints;
    this.licenses = licenses;
    this.serieses = serieses;
    this.lookupCoordinator = new ImportLookupCoordinator(contributorService, institutionService);
    this.t = t;
  }

  /**
   * A CSV import has no chapters: the template describes one work per row, with no equivalent
   * of an ONIX ContentItem, so the plan's chapters are always empty rather than optional.
   *
   * Parsing is two phases with a strict boundary between them.
   *
   * The first phase is a deterministic preflight: the file is parsed into one canonical row
   * representation, `csv-file-validator` and every schema-named preflight rule are evaluated
   * across *all* trustworthy rows, and series identity is resolved against the already-loaded
   * series list. Nothing in this phase touches the network. If anything blocks, every
   * independently actionable finding is returned together, with an empty plan — the historical
   * behaviour of stopping at the first validation layer is exactly what this phase replaces.
   *
   * Only a clean preflight reaches the second phase, which is the pre-existing pipeline:
   * contributor/institution lookups, row parsing, series planning, contributor selection. A
   * genuine lookup failure there remains a hard parser failure, exactly as before.
   */
  async parse(): Promise<ImportParseResult> {
    try {
      const structure = await this.readCanonicalStructure();

      // An unusable parse yields one file-level failure rather than a cascade of row findings
      // guessed from misidentified columns: nothing read out of an untrustworthy structure could
      // name the cell the user has to fix.
      if (structure.kind === 'unreadable') {
        return {
          status: 'failed',
          data: this.emptyData(),
          issues: [
            {
              severity: 'error',
              code: 'csv.validation',
              message: this.t(ERRORS.CSV_PARSING_ERROR),
              source: { kind: 'file' },
            },
          ],
        };
      }

      const { canonicalFile, rows } = structure;

      // The file validator sees the canonical representation — the same cells, in the same form,
      // that the preflight rules validate and that a successful parse plans and imports.
      const csvParseResult = await CSVFileValidator<CsvValidatorRow>(canonicalFile, this.csvConfig);

      // App-owned deterministic rules over the same canonical rows. An earlier validator finding
      // never suppresses these: they read different fields, so each is independently actionable.
      // The reverse suppression does exist, and only for boundary defects: a cell the validator
      // rejects *solely because of* stray whitespace already reported by the boundary rule keeps
      // the one actionable finding rather than two phrasings of the same keystroke.
      const context = { imprintLabels: this.imprints.map(({ label }) => label) };
      const suppressedCells = new Set<string>();

      rows.forEach((row, index) =>
        collectRowPreflightFindings(row, index + 1, this.t, context).forEach(
          ({ message, suppressValidatorFinding }) => {
            this.pushIssue(index + 1, message);

            if (suppressValidatorFinding) suppressedCells.add(`${index + 1}:${suppressValidatorFinding}`);
          },
        ),
      );

      // The file validator numbers its rows in more than one way and reports header problems
      // that belong to no data row; `toValidatorIssues` normalises both onto this parser's own
      // row numbering. A cell finding names its column, which — the canonical file being in
      // schema order — is the schema position of the field, so it can be matched against the
      // boundary-suppression set built above.
      const validatorIssues = toValidatorIssues(
        csvParseResult.inValidData.filter(({ rowIndex, columnIndex }) => {
          if (rowIndex === undefined || columnIndex === undefined) return true;

          const key = csvSchema[columnIndex - 1]?.key;

          return key === undefined || !suppressedCells.has(`${rowIndex - 1}:${key}`);
        }),
        this.csvConfig,
      );

      // Series identity and numbering need no network either, so their findings belong in the
      // same preflight result instead of surfacing only after everything else is fixed.
      this.collectSeriesPreflightIssues(rows);

      const preflightIssues = sortIssues([...validatorIssues, ...this.issues]);

      if (importStatus(preflightIssues) === 'failed') {
        return { status: 'failed', data: this.emptyData(), issues: preflightIssues };
      }

      const data = rows;

      // `Promise.all` resolves in input order regardless of completion order, so collecting the
      // results here — rather than letting each concurrent `parseRow` push into shared state —
      // keeps works, contributor selections and series ordinals in CSV source-row order.
      const parsedRows = await Promise.all(data.map((row, index) => this.parseRow(row, index + 1)));

      this.parsedWorks = parsedRows.map(({ work }) => work);
      // Every row owns a freshly generated work id, so merging the per-row maps cannot collide.
      this.contributorsForSelection = Object.assign({}, ...parsedRows.map((parsed) => parsed.contributorsForSelection));

      const { plan, issues } = buildSeriesPlan(
        parsedRows.map(({ work, seriesCandidate }) => ({ work, candidate: seriesCandidate })),
        this.serieses,
        this.seriesMessages,
      );

      this.parsedSeries = plan;
      // The shared planner tags issues with a source index, which for CSV is the row number.
      issues.forEach(({ index, severity, code, message }) =>
        this.issues.push({ severity, code, message, source: { kind: 'csv', row: index } }),
      );

      const sortedIssues = sortIssues(this.issues);

      if (importStatus(sortedIssues) === 'failed') {
        return { status: 'failed', data: this.emptyData(), issues: sortedIssues };
      }

      return {
        status: 'success',
        data: {
          plan: { works: this.parsedWorks, chapters: [], series: this.parsedSeries },
          contributorsForSelection: this.contributorsForSelection,
        },
        issues: sortedIssues,
      };
    } catch (_error) {
      return {
        status: 'failed',
        data: this.emptyData(),
        issues: [
          {
            severity: 'error',
            code: 'csv.parsing_failed',
            message: this.t(ERRORS.CSV_PARSING_ERROR),
            source: { kind: 'file' },
          },
        ],
      };
    }
  }

  /** A failed parse creates nothing, so it carries a plan that would create nothing. */
  private emptyData() {
    return { plan: createEmptyImportPlan(), contributorsForSelection: {} };
  }

  /**
   * Every issue this parser raises comes from one CSV data row, so the row number is required
   * rather than optional. There is no synthetic bucket for issues that "have no row": a helper
   * that cannot name its row would be a helper whose output order depends on which row's
   * lookups finished first.
   *
   * File-level problems never reach here — `csv-file-validator` findings and the catch-all
   * parsing failure are returned straight from `parse`, ahead of any row parsing.
   *
   * CSV has no warnings yet: every row-level rule it applies is one the import cannot proceed
   * without, so the severity is fixed rather than passed in.
   */
  private pushIssue(row: number, message: string) {
    this.issues.push({ severity: 'error', code: 'csv.validation', message, source: { kind: 'csv', row } });
  }

  /** How the shared series planner phrases its errors for a CSV import. */
  private get seriesMessages(): SeriesPlanMessages {
    return {
      validationCode: 'csv.validation',
      ambiguousMatch: ({ name, count, source }) => this.t('errors.csvSeriesAmbiguous', { name, count, source }),
      conflictingMatches: ({ name, sources }) => this.t('errors.csvSeriesConflictingMatches', { name, sources }),
      duplicateOrdinal: ({ name, ordinal, sources }) =>
        this.t('errors.csvSeriesDuplicateIssueNumber', { name, ordinal, sources }),
      ordinalAlreadyInThoth: ({ name, ordinal, sources }) =>
        this.t('errors.csvSeriesIssueNumberTaken', { name, ordinal, sources }),
    };
  }

  private async parseRow(row: CsvRow, rowNumber: number): Promise<ParsedRow> {
    const workId = this.generateId();

    const breakdown = this.parsePageBreakdownField(row, CSV_KEYS.PAGE_BREAKDOWN, rowNumber);
    const { contributions, contributorsForSelection } = await this.parseContributors(row, workId, rowNumber);
    const explicitPageCount = this.parseNumberField(row, CSV_KEYS.PAGE_COUNT, rowNumber);
    const imprintId = this.parseImprint(row, rowNumber);

    const parsedWork = getDefaultWork({
      id: workId,
      titles: this.parseTitles(row, rowNumber),
      abstracts: this.parseAbstracts(row, rowNumber),
      type: this.parseStringField(row, CSV_KEYS.WORK_TYPE, rowNumber) as WorkType,
      doi: this.parseStringField(row, CSV_KEYS.DOI, rowNumber),
      publisherName: this.parseStringField(row, CSV_KEYS.IMPRINT, rowNumber),
      imprintId,
      status: this.parseStringField(row, CSV_KEYS.WORK_STATUS, rowNumber) as WorkStatus,
      edition: this.parseNumberField(row, CSV_KEYS.EDITION, rowNumber),
      license: this.parseLicenseField(row, CSV_KEYS.LICENSE, rowNumber),
      copyrightHolder: this.parseStringField(row, CSV_KEYS.COPYRIGHT_HOLDER, rowNumber),
      landingPage: this.parseStringField(row, CSV_KEYS.LANDING_PAGE, rowNumber),
      coverUrl: this.parseStringField(row, CSV_KEYS.COVER_URL, rowNumber),
      publicationDate: this.parseStringField(row, CSV_KEYS.PUBLICATION_DATE, rowNumber),
      withdrawnDate: this.parseStringField(row, CSV_KEYS.WITHDRAWN_DATE, rowNumber),
      place: this.parseStringField(row, CSV_KEYS.PLACE_OF_PUBLICATION, rowNumber),
      imageCount: this.parseNumberField(row, CSV_KEYS.IMAGE_COUNT, rowNumber),
      tableCount: this.parseNumberField(row, CSV_KEYS.TABLE_COUNT, rowNumber),
      audioCount: this.parseNumberField(row, CSV_KEYS.AUDIO_COUNT, rowNumber),
      videoCount: this.parseNumberField(row, CSV_KEYS.VIDEO_COUNT, rowNumber),
      pageCount: breakdown.pageCount || explicitPageCount,
      frontmatterCount: breakdown.frontmatterCount,
      backmatterCount: breakdown.backmatterCount,
      languages: this.parseLanguages(
        row,
        CSV_KEYS.ORIGINAL_LANGUAGE,
        CSV_KEYS.TRANSLATED_FROM_LANGUAGE,
        CSV_KEYS.TRANSLATED_INTO_LANGUAGE,
        rowNumber,
      ),
      subjects: this.parseSubjects(
        row,
        CSV_KEYS.THEMA_SUBJECTS,
        CSV_KEYS.BIC_SUBJECTS,
        CSV_KEYS.BISAC_SUBJECTS,
        CSV_KEYS.LCC_SUBJECTS,
        CSV_KEYS.KEYWORDS,
        rowNumber,
      ),
      publications: this.parsePublication(row, rowNumber),
      contributions,
    });

    return {
      work: parsedWork,
      contributorsForSelection,
      seriesCandidate: this.parseSeries(row, rowNumber, imprintId),
    };
  }

  /**
   * Resolves the series consequences of every canonical row using only data this parser already
   * holds — the user's imprints and the pre-fetched series list — so they can be reported inside
   * the deterministic preflight. The plan built here is discarded: after a clean preflight the
   * second phase rebuilds it from the parsed works, from the same deterministic inputs.
   *
   * Cascade suppression, unchanged from the row parser it mirrors: a row whose imprint did not
   * resolve contributes no series candidate, because the validator has already reported the
   * imprint itself and series identity cannot be scoped without one. The issue-number checks
   * still run for such a row — they are independent of the imprint.
   */
  private collectSeriesPreflightIssues(rows: CsvRow[]): void {
    const members = rows.map((row, index) => {
      const rowNumber = index + 1;
      const imprintName = this.parseStringField(row, CSV_KEYS.IMPRINT, rowNumber);
      const imprint = this.imprints.find((option) => option.label === imprintName);

      return {
        // A placeholder work: `buildSeriesPlan` needs one per member, but only its identity, and
        // nothing from this throwaway plan survives into the real one.
        work: getDefaultWork({ id: this.generateId() }),
        candidate: this.parseSeries(row, rowNumber, imprint?.value ?? ''),
      };
    });

    const { issues } = buildSeriesPlan(members, this.serieses, this.seriesMessages);

    issues.forEach(({ index, severity, code, message }) =>
      this.issues.push({ severity, code, message, source: { kind: 'csv', row: index } }),
    );
  }

  private parseStringField(row: CsvRow, field: CsvFieldKey, _rowNumber: number) {
    const value = row[field];

    if (value === undefined) return '';

    return value;
  }

  private parseNumberField(row: CsvRow, field: CsvFieldKey, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return 0;
    }

    const numberValue = parseInt(value);

    if (isNaN(numberValue)) {
      this.pushIssue(rowNumber, this.t('errors.csvFieldNotNumber', { field, row: rowNumber }));

      return 1;
    }

    return numberValue;
  }

  private parseFloatNumberField(row: CsvRow, field: CsvFieldKey, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return 0;
    }

    const numberValue = parseFloat(value);

    if (isNaN(numberValue)) {
      this.pushIssue(rowNumber, this.t('errors.csvFieldNotNumber', { field, row: rowNumber }));

      return 0;
    }

    return numberValue;
  }

  private parseImprint(row: CsvRow, rowNumber: number) {
    const imprintName = this.parseStringField(row, CSV_KEYS.IMPRINT, rowNumber);

    const imprint = this.imprints.find((imprint) => imprint.label === imprintName);

    if (!imprint) {
      this.pushIssue(rowNumber, this.t('errors.csvImprintNotFound', { name: imprintName, row: rowNumber }));
      return '';
    }

    return imprint.value;
  }

  private parsePageBreakdownField(row: CsvRow, field: CsvFieldKey, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    const [frontmatterCount = '', totalPages = '', backmatterCount = ''] = value.split('+');

    return {
      frontmatterCount: totalPages.length > 0 ? convertRomanToArabic(frontmatterCount) : 0,
      backmatterCount: totalPages.length > 0 ? convertRomanToArabic(backmatterCount) : 0,
      pageCount: totalPages.length > 0 ? parseInt(totalPages) : 0,
    };
  }

  private parseTitles(row: CsvRow, rowNumber: number): TitleEntity[] {
    const title = this.parseStringField(row, CSV_KEYS.TITLE, rowNumber);
    const subtitle = this.parseStringField(row, CSV_KEYS.SUBTITLE, rowNumber);
    const fullTitle = compileFullTitle(title, subtitle);

    return [getDefaultTitle({ canonical: true, title, subtitle, fullTitle })];
  }

  private parseAbstracts(row: CsvRow, rowNumber: number): AbstractEntity[] {
    const longAbstract = this.parseStringField(row, CSV_KEYS.LONG_ABSTRACT, rowNumber);
    const shortAbstract = this.parseStringField(row, CSV_KEYS.SHORT_ABSTRACT, rowNumber);
    const abstracts: AbstractEntity[] = [];

    if (longAbstract.length > 0) {
      abstracts.push(getDefaultAbstract({ content: longAbstract, type: AbstractTypes.enum.Long, canonical: true }));
    }

    if (shortAbstract.length > 0) {
      abstracts.push(getDefaultAbstract({ content: shortAbstract, type: AbstractTypes.enum.Short, canonical: false }));
    }

    return abstracts;
  }

  private parseLicenseField(row: CsvRow, field: CsvFieldKey, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return value;
    }

    const license = this.licenses.find((option) => option.value.startsWith(`${value}`));

    if (!license) {
      this.pushIssue(rowNumber, this.t('errors.csvLicenseNotFound', { value, row: rowNumber }));

      return '';
    }

    return license.value;
  }

  private parseLanguages(
    row: CsvRow,
    originalLanguage: CsvFieldKey,
    translatedFromLanguage: CsvFieldKey,
    translatedIntoLanguage: CsvFieldKey,
    rowNumber: number,
  ) {
    const originalLanguageValue = this.parseStringField(row, originalLanguage, rowNumber);
    const translatedFromLanguageValue = this.parseStringField(row, translatedFromLanguage, rowNumber);
    const translatedIntoLanguageValue = this.parseStringField(row, translatedIntoLanguage, rowNumber);
    const languages = [];

    if (originalLanguageValue && `${originalLanguageValue}`.length > 0) {
      languages.push({
        id: this.defaultId,
        code: originalLanguageValue as LanguageCode,
        relation: LanguageRelation.enum.Original,
        isMain: true,
      });
    }

    if (translatedFromLanguageValue && `${translatedFromLanguageValue}`.length > 0) {
      languages.push({
        id: this.defaultId,
        code: translatedFromLanguageValue as LanguageCode,
        relation: LanguageRelation.enum.TranslatedFrom,
        isMain: true,
      });
    }

    if (translatedIntoLanguageValue && `${translatedIntoLanguageValue}`.length > 0) {
      languages.push({
        id: this.defaultId,
        code: translatedIntoLanguageValue as LanguageCode,
        relation: LanguageRelation.enum.TranslatedInto,
        isMain: true,
      });
    }

    return languages;
  }

  private parseSubjects(
    row: CsvRow,
    themeSubjects: CsvFieldKey,
    bicSubjects: CsvFieldKey,
    bisacSubjects: CsvFieldKey,
    lccSubjects: CsvFieldKey,
    keywordSubjects: CsvFieldKey,
    rowNumber: number,
  ) {
    const subjects: SubjectEntity[] = [];
    const themeSubjectsValue = this.parseStringField(row, themeSubjects, rowNumber)
      .split(',')
      .map((subject) => subject.trim());
    const bicSubjectsValue = this.parseStringField(row, bicSubjects, rowNumber)
      .split(',')
      .map((subject) => subject.trim());
    const bisacSubjectsValue = this.parseStringField(row, bisacSubjects, rowNumber)
      .split(',')
      .map((subject) => subject.trim());
    const lccSubjectsValue = this.parseStringField(row, lccSubjects, rowNumber)
      .split(',')
      .map((subject) => subject.trim());
    const keywordSubjectsValue = this.parseStringField(row, keywordSubjects, rowNumber)
      .split(',')
      .map((subject) => subject.trim());

    themeSubjectsValue.forEach((subject) => {
      if (subject.length === 0) return;

      subjects.push({
        id: this.defaultId,
        code: subject,
        type: SubjectTypes.enum.Thema,
        ordinal: subjects.length + 1,
      });
    });

    bicSubjectsValue.forEach((subject) => {
      if (subject.length === 0) return;

      subjects.push({
        id: this.defaultId,
        code: subject,
        type: SubjectTypes.enum.Bic,
        ordinal: subjects.length + 1,
      });
    });

    bisacSubjectsValue.forEach((subject) => {
      if (subject.length === 0) return;

      subjects.push({
        id: this.defaultId,
        code: subject,
        type: SubjectTypes.enum.Bisac,
        ordinal: subjects.length + 1,
      });
    });

    lccSubjectsValue.forEach((subject) => {
      if (subject.length === 0) return;

      subjects.push({
        id: this.defaultId,
        code: subject,
        type: SubjectTypes.enum.Lcc,
        ordinal: subjects.length + 1,
      });
    });

    keywordSubjectsValue.forEach((subject) => {
      if (subject.length === 0) return;

      subjects.push({
        id: this.defaultId,
        code: subject,
        type: SubjectTypes.enum.Keyword,
        ordinal: subjects.length + 1,
      });
    });

    return subjects;
  }

  private parsePublication(row: CsvRow, rowNumber: number) {
    const publications: PublicationEntity[] = [];

    const paperbackIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_PAPERBACK_ISBN, rowNumber);
    const paperbackCurrencyCode = this.parseStringField(
      row,
      CSV_KEYS.PUBLICATION_PAPERBACK_PRICE_1_CURRENCY_CODE,
      rowNumber,
    );
    const paperbackUnitPrice = this.parseFloatNumberField(
      row,
      CSV_KEYS.PUBLICATION_PAPERBACK_PRICE_1_UNIT_PRICE,
      rowNumber,
    );
    const isPaperbackPriceFilled = paperbackCurrencyCode.length !== 0 && paperbackUnitPrice !== 0;
    const hardbackIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_HARDBACK_ISBN, rowNumber);
    const hardbackCurrencyCode = this.parseStringField(
      row,
      CSV_KEYS.PUBLICATION_HARDBACK_PRICE_1_CURRENCY_CODE,
      rowNumber,
    );
    const hardbackUnitPrice = this.parseFloatNumberField(
      row,
      CSV_KEYS.PUBLICATION_HARDBACK_PRICE_1_UNIT_PRICE,
      rowNumber,
    );
    const isHardbackPriceFilled = hardbackCurrencyCode.length !== 0 && hardbackUnitPrice !== 0;
    const pdfIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_ISBN, rowNumber);
    const pdfLocationLandingPage = this.parseStringField(
      row,
      CSV_KEYS.PUBLICATION_PDF_LOCATION_LANDING_PAGE,
      rowNumber,
    );
    const pdfLocationFullTextUrl = this.parseStringField(
      row,
      CSV_KEYS.PUBLICATION_PDF_LOCATION_FULL_TEXT_URL,
      rowNumber,
    );
    const pdfLocationPlatform = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_LOCATION_PLATFORM, rowNumber);
    const isPdfLocationFilled =
      pdfLocationLandingPage.length !== 0 || pdfLocationFullTextUrl.length !== 0 || pdfLocationPlatform.length !== 0;

    if (paperbackIsbn.length > 0) {
      const publication = getDefaultPublication({
        isbn: `${paperbackIsbn}`,
        type: PublicationType.enum.Paperback,
      });

      const prices = isPaperbackPriceFilled
        ? [
            {
              id: this.defaultId,
              currencyCode: paperbackCurrencyCode as CurrencyCode,
              unitPrice: paperbackUnitPrice,
            },
          ]
        : [];

      publications.push({ ...publication, prices });
    }

    if (hardbackIsbn.length > 0) {
      const publication = getDefaultPublication({
        isbn: `${hardbackIsbn}`,
        type: PublicationType.enum.Hardback,
      });

      const prices = isHardbackPriceFilled
        ? [
            {
              id: this.defaultId,
              currencyCode: hardbackCurrencyCode as CurrencyCode,
              unitPrice: hardbackUnitPrice,
            },
          ]
        : [];

      publications.push({ ...publication, prices });
    }

    if (pdfIsbn.length > 0) {
      const publication = getDefaultPublication({
        isbn: `${pdfIsbn}`,
        type: PublicationType.enum.Pdf,
      });

      const locations = isPdfLocationFilled
        ? [
            {
              canonical: true,
              id: this.defaultId,
              landingPage: pdfLocationLandingPage,
              fullTextUrl: pdfLocationFullTextUrl,
              locationPlatform: pdfLocationPlatform as LocationPlatform,
            },
          ]
        : [];

      publications.push({ ...publication, locations });
    }

    return publications;
  }

  /**
   * Resolves one row's `series_name` into a series candidate.
   *
   * This is the CSV adapter over the shared series planner, so a CSV import and an ONIX import
   * agree on what a series is: identity is the row's imprint plus the normalised name, matching
   * is exact-then-normalised within that imprint, and a name Thoth does not have becomes a
   * proposed series rather than an error. It is pure — nothing is created here, and grouping
   * and ordinal assignment happen later, once every row has been parsed.
   *
   * FOLLOW-UP: `series_issn` is deliberately not consulted, here or anywhere else. The column
   * exists in the template and has never had import semantics, and giving it some would be a
   * CSV schema decision rather than a parsing one — a single `series_issn` cannot say whether
   * it is the print or the digital ISSN, which are separate fields on a Thoth series, and using
   * it for matching would introduce a second identity rule alongside the name. We need to
   * decide separately whether to remove/deprecate the column, or replace it with explicit
   * `series_issn_print` and `series_issn_digital` columns with real mappings. Until then it is
   * accepted and ignored, so existing files keep importing.
   */
  private parseSeries(row: CsvRow, rowNumber: number, imprintId: string): SeriesCandidate | undefined {
    const seriesName = this.parseStringField(row, CSV_KEYS.SERIES_NAME, rowNumber).trim();
    const issueNumber = this.parseStringField(row, CSV_KEYS.SERIES_ISSUE_NUMBER, rowNumber).trim();

    if (seriesName.length === 0) {
      // An issue ordinal names a work's position within a series, so without a series there is
      // nothing for it to be an ordinal of. Silently dropping it would lose data the publisher
      // meant to supply — most likely they forgot the series name, or misaligned a column.
      if (issueNumber.length > 0) {
        this.pushIssue(
          rowNumber,
          this.t('errors.csvSeriesIssueNumberWithoutSeries', { value: issueNumber, row: rowNumber }),
        );
      }

      return undefined;
    }

    // Validated even when the imprint is unresolved, so a row never fails for the imprint alone
    // and then fails again for the issue number on the next upload.
    const ordinal = this.parseIssueNumber(issueNumber, rowNumber);

    // Without a resolved imprint we can neither scope the identity nor create a series. The
    // unresolved imprint is already reported by parseImprint, so stay quiet here.
    if (imprintId.length === 0) return undefined;

    const resolved = resolveSeriesCandidate(
      {
        name: seriesName,
        imprintId,
        sourceIndex: rowNumber,
        sourceDescription: this.describeRow(rowNumber),
        ordinal,
        // A publisher naming a series in their own upload is asking for that series, so CSV is
        // always allowed to create one. ONIX has to be more careful, because a Collection may
        // be somebody else's grouping rather than the publisher's series.
        creation: { allowed: true },
      },
      this.serieses,
      this.seriesMessages,
    );

    if ('issue' in resolved) {
      const { index, severity, code, message } = resolved.issue;

      this.issues.push({ severity, code, message, source: { kind: 'csv', row: index } });

      return undefined;
    }

    return resolved.candidate;
  }

  /** A short handle for a row, used to make series errors actionable. */
  private describeRow(rowNumber: number): string {
    return this.t('errors.csvRow', { row: rowNumber });
  }

  /**
   * Reads an already-trimmed `series_issue_number`, which is optional and means two different
   * things.
   *
   * Blank means the publisher supplied no ordinal at all, and the planner should allocate one
   * safely — not that the work is issue 0, which is what feeding a blank through the ordinary
   * number parser used to produce.
   *
   * Anything else must be an ordinal Thoth can actually store. The digits-only pattern rules out
   * signs, decimals, exponents and `Infinity` in one go, leaving magnitude as the only thing to
   * bound. The bound comes from the schema rather than from taste: `issueOrdinal` is a GraphQL
   * `Int`, which the specification defines as a signed 32-bit integer, so anything above
   * {@link MAX_ISSUE_ORDINAL} would be rejected by the API partway through an import. (Thoth's
   * own `positiveIntValidation` is not reused here: it is a form-field rule built on
   * `z.coerce.number()`, so it accepts `1.5` and has no upper bound.)
   */
  private parseIssueNumber(value: string, rowNumber: number): number | undefined {
    if (value.length === 0) return undefined;

    const ordinal = Number(value);

    if (!/^\d+$/.test(value) || ordinal < 1 || ordinal > MAX_ISSUE_ORDINAL) {
      this.pushIssue(rowNumber, this.t('errors.csvSeriesIssueNumberNotValid', { value, row: rowNumber }));

      return undefined;
    }

    return ordinal;
  }

  private async parseContributors(row: CsvRow, workId: WorkId, rowNumber: number) {
    const contributors = new Array(appConfig.maxCsvContributorsCount).fill(null).map((_, index) => {
      const {
        FIRST_NAME,
        LAST_NAME,
        ROLE,
        BIOGRAPHY,
        ORCID,
        WEBSITE,
        AFFILIATION_POSITION,
        AFFILIATION_INSTITUTION_ROR,
      } = getContributorFieldsByIndex(index + 1);

      const contributorFirstName = this.parseStringField(row, FIRST_NAME, rowNumber);
      const contributorLastName = this.parseStringField(row, LAST_NAME, rowNumber);
      const contributorRole = this.parseStringField(row, ROLE, rowNumber);
      const contributorBiography = this.parseStringField(row, BIOGRAPHY, rowNumber);
      const contributorOrcid = this.parseStringField(row, ORCID, rowNumber);
      const contributorWebsite = this.parseStringField(row, WEBSITE, rowNumber);
      const contributorAffiliationPosition = this.parseStringField(row, AFFILIATION_POSITION, rowNumber);
      const contributorAffiliationInstitutionRor = this.parseStringField(
        row,
        AFFILIATION_INSTITUTION_ROR,
        rowNumber,
      ).trim();

      return {
        fullName: contributorFirstName + ' ' + contributorLastName,
        firstName: contributorFirstName,
        lastName: contributorLastName,
        orcid: contributorOrcid,
        website: contributorWebsite,
        biography: contributorBiography,
        type: contributorRole,
        affiliationPosition: contributorAffiliationPosition,
        affiliationInstitutionRor: contributorAffiliationInstitutionRor,
      };
    });

    const filteredContributors = contributors.filter(({ fullName }) => fullName && fullName.length > 1);

    const workContributions: WorkContribution[] = [];
    const contributorsForSelection: ContributorsForSelection = {
      [workId]: {},
    };

    for (let i = 0; i < filteredContributors.length; i++) {
      const {
        fullName,
        lastName,
        firstName,
        affiliationPosition,
        affiliationInstitutionRor,
        type,
        biography,
        orcid,
        website,
      } = filteredContributors[i];

      const [foundedContributors, institution] = await Promise.all([
        this.lookupCoordinator.findContributors(fullName),
        this.lookupCoordinator.findInstitutionByRor(affiliationInstitutionRor),
      ]);

      const affiliation = institution
        ? getDefaultAffiliation({
            institutionId: institution.id,
            institutionName: institution.name,
            rorId: institution.ror,
            position: affiliationPosition || '',
          })
        : null;

      const orderNumber = i + 1;

      const biographies =
        biography.length > 0
          ? [
              {
                id: this.defaultId,
                canonical: true,
                content: biography,
                localeCode: LocaleCode.En,
                contributionId: this.defaultId,
              },
            ]
          : [];

      const contributionWithNewContributor = getDefaultContribution({
        fullName,
        lastName,
        firstName,
        type: type as ContributionType,
        isMain: true,
        orderNumber,
        biographies,
        orcidId: orcid || '',
        website: website || '',
        contributorId: this.defaultId,
        affiliations: affiliation ? [affiliation] : [],
      });

      const contributorsForSelectionItemId = this.generateId();

      contributorsForSelection[workId][contributorsForSelectionItemId] = [
        { ...contributionWithNewContributor, selected: true, lastContribution: '' },
      ];

      if (foundedContributors.length > 0) {
        foundedContributors.forEach((foundedContributor) => {
          const contribution = getDefaultContribution({
            fullName: foundedContributor.fullName,
            lastName: foundedContributor.lastName,
            firstName: foundedContributor.firstName,
            contributorId: foundedContributor.id,
            type: type as ContributionType,
            isMain: true,
            orderNumber,
            biographies,
            orcidId: foundedContributor.orcid,
            website: foundedContributor.website,
            affiliations: affiliation ? [affiliation] : [],
          });

          contributorsForSelection[workId][contributorsForSelectionItemId].push({
            ...contribution,
            selected: false,
            lastContribution: foundedContributor.lastContributionTitle,
          });
        });
      }

      workContributions.push(contributionWithNewContributor);
    }

    // Returned rather than merged into parser-wide state: rows are parsed concurrently, and a
    // row's selection options belong to that row's work, not to whichever row finished last.
    return { contributions: workContributions, contributorsForSelection };
  }

  /**
   * Reads the source file into the one canonical representation everything downstream shares.
   *
   * Trustworthy means all of: Papa Parse read the bytes into rows without a structural
   * complaint (broken quoting); every data row has exactly the header row's width, so no cell
   * has spilled across columns or gone missing; no two source columns resolve to the same
   * canonical field after alias normalisation; and at least one canonical template column was
   * recognised in the header. Only then are cell values worth judging: each is canonicalised
   * once by `toCanonicalCsvValue`, and those exact strings feed the file validator, every
   * preflight rule, and — when everything passes — the ImportPlan itself. Delimiter handling is
   * unchanged: any delimiter Papa Parse can detect unambiguously is rewritten into the canonical
   * comma-delimited form, as it always was.
   *
   * An untrustworthy source reports `unreadable` and is never guessed at: fabricating hundreds
   * of row findings from misidentified columns would bury the one problem the user can fix.
   */
  private readCanonicalStructure(): Promise<{ kind: 'unreadable' } | { kind: 'rows'; canonicalFile: File; rows: CsvRow[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });

        if (parsed.errors.length > 0 || !parsed.data.length) {
          resolve({ kind: 'unreadable' });
          return;
        }

        const [headerRow, ...dataRows] = parsed.data;

        // A row wider or narrower than its own header is structural corruption — most often an
        // unquoted delimiter inside a value. Mapping such a row by header positions would
        // silently truncate the split cell and swallow the spilled remainder, so the source is
        // untrustworthy as a whole: no cell of it is guessed at, validated, or planned.
        if (dataRows.some((row) => row.length !== headerRow.length)) {
          resolve({ kind: 'unreadable' });
          return;
        }

        const normalizedHeaders = headerRow.map(normaliseCsvHeader);

        // Two source columns resolving to the same canonical field — `imprint` twice, or
        // `publisher` alongside `imprint` — leave no honest answer to which column holds the
        // value. Last-one-wins would silently discard a column the user typed, so the ambiguity
        // is structural too.
        const schemaHeaders = new Set<string>(csvSchema.map(({ header }) => header));
        const seenSchemaHeaders = new Set<string>();

        for (const header of normalizedHeaders) {
          if (!schemaHeaders.has(header)) continue;

          if (seenSchemaHeaders.has(header)) {
            resolve({ kind: 'unreadable' });
            return;
          }

          seenSchemaHeaders.add(header);
        }

        if (seenSchemaHeaders.size === 0) {
          resolve({ kind: 'unreadable' });
          return;
        }

        const headerIndex = new Map<string, number>(normalizedHeaders.map((h, i) => [h, i]));

        const rows = dataRows.map(
          (row) =>
            Object.fromEntries(
              csvSchema.map((field) => {
                const pos = headerIndex.get(field.header);
                const raw = pos !== undefined ? (row[pos] ?? '') : '';

                return [field.key, toCanonicalCsvValue(field, raw)];
              }),
            ) as CsvRow,
        );

        const canonicalCsv = Papa.unparse([
          csvSchema.map(({ header }) => header),
          ...rows.map((row) => csvSchema.map(({ key }) => row[key])),
        ]);

        resolve({
          kind: 'rows',
          canonicalFile: new File([canonicalCsv], this.csv.name, { type: this.csv.type }),
          rows,
        });
      };
      reader.onerror = () => resolve({ kind: 'unreadable' });
      reader.readAsText(this.csv);
    });
  }

  private generateId() {
    return uuidv4();
  }
}

export default CSVParser;
