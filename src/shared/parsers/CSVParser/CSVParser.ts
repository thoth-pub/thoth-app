import CSVFileValidator, { type ValidatorConfig } from 'csv-file-validator';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

import {
  ContributionType,
  ContributionType as GQLContributionType,
  CurrencyCode,
  LanguageCode,
  LocaleCode,
  LocationPlatform as GQLLocationPlatform,
  LocationPlatform,
  WorkStatus as GQLWorkStatus,
  WorkType as GQLWorkType,
} from '@/gql/graphql';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { SubjectEntity } from '@/src/entities/subject/model/subject.types';
import { WorkEntity, WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import {
  CSV_KEYS,
  getContributorFieldsByIndex,
  getDefaultAffiliation,
  getDefaultContribution,
  LanguageRelation,
  PublicationType,
  SubjectTypes,
} from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { ERRORS } from '../../constants/errors';
import { FormFieldOption } from '../../interfaces';
import { compileFullTitle } from '../../utils/titles';
import type { AbstractEntity, ContributorsForSelection, SeriesForUpdateItems, TitleEntity } from '../../types';
import {
  convertRomanToArabic,
  getDefaultAbstract,
  getDefaultPublication,
  getDefaultTitle,
  getDefaultWork,
} from '../../utils';

export type CSVFieldType = string | number | boolean;

export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

// For enum entry { EditedBook: 'EDITED_BOOK' } accepts 'EDITED_BOOK', 'EditedBook', and 'Edited Book'
function buildEnumAliasMap(enumObj: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(enumObj)) {
    const display = key.replace(/([A-Z])/g, ' $1').trim();
    map.set(value.toLowerCase(), value);
    map.set(key.toLowerCase(), value);
    map.set(display.toLowerCase(), value);
  }
  return map;
}

type Row = {
  [CSVKey in (typeof CSV_KEYS)[keyof typeof CSV_KEYS]]: CSVFieldType;
};

type CSVParseResult = {
  status: 'success' | 'failed';
  data: {
    works: WorkEntity[];
    series: SeriesForUpdateItems;
    contributorsForSelection: ContributorsForSelection;
  };
  errors: string[];
};

export class CSVParser {
  private csv: File;
  private csvConfig: ValidatorConfig;
  private errors: string[] = [];
  private parsedWorks: WorkEntity[] = [];
  private parsedSeries: SeriesForUpdateItems = {};
  private contributorsForSelection: ContributorsForSelection = {};
  private imprints: FormFieldOption[] = [];
  private licenses: FormFieldOption[] = [];
  private serieses: SeriesEntity[] = [];
  private defaultId: string = appConfig.defaultId;
  private contributorService: ContributorService;
  private institutionService: InstitutionService;
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
    this.contributorService = contributorService;
    this.institutionService = institutionService;
    this.t = t;
  }

  async parse(): Promise<CSVParseResult> {
    try {
      const csvParseResult = await CSVFileValidator(await this.normalizeFile(), this.csvConfig);

      const isErrors = csvParseResult.inValidData.length > 0;

      if (isErrors) {
        const errors = csvParseResult.inValidData.map((error) => error.message);
        this.errors = errors;

        return { status: 'failed', data: { works: [], series: {}, contributorsForSelection: {} }, errors };
      }

      const data: Row[] = csvParseResult.data;

      await Promise.all(data.map((row, index) => this.parseRow(row, index + 1)));

      if (this.errors.length > 0) {
        return { status: 'failed', data: { works: [], series: {}, contributorsForSelection: {} }, errors: this.errors };
      }

      return {
        status: 'success',
        data: {
          works: this.parsedWorks,
          series: this.parsedSeries,
          contributorsForSelection: this.contributorsForSelection,
        },
        errors: [],
      };
    } catch (_error) {
      return {
        status: 'failed',
        data: { works: [], series: {}, contributorsForSelection: {} },
        errors: [this.t(ERRORS.CSV_PARSING_ERROR)],
      };
    }
  }

  private async parseRow(row: Row, rowNumber: number) {
    const workId = this.generateId();

    const breakdown = this.parsePageBreakdownField(row, CSV_KEYS.PAGE_BREAKDOWN, rowNumber);
    const contributions = await this.parseContributors(row, workId);
    const explicitPageCount = this.parseNumberField(row, CSV_KEYS.PAGE_COUNT, rowNumber);

    const parsedWork = getDefaultWork({
      id: workId,
      titles: this.parseTitles(row, rowNumber),
      abstracts: this.parseAbstracts(row, rowNumber),
      type: this.parseStringField(row, CSV_KEYS.WORK_TYPE, rowNumber) as WorkType,
      doi: this.parseStringField(row, CSV_KEYS.DOI, rowNumber),
      publisherName: this.parseStringField(row, CSV_KEYS.IMPRINT, rowNumber),
      imprintId: this.parseImprint(row, rowNumber),
      status: this.parseStringField(row, CSV_KEYS.WORK_STATUS, rowNumber) as WorkStatus,
      edition: this.parseNumberField(row, CSV_KEYS.EDITION, rowNumber),
      license: this.parseLicenseField(row, CSV_KEYS.LICENSE, rowNumber),
      copyrightHolder: this.parseStringField(row, CSV_KEYS.COPYRIGHT_HOLDER, rowNumber),
      landingPage: this.parseStringField(row, CSV_KEYS.LANDING_PAGE, rowNumber),
      coverUrl: this.parseStringField(row, CSV_KEYS.COVER_URL, rowNumber),
      publicationDate: this.parseStringField(row, CSV_KEYS.PUBLICATION_DATE, rowNumber),
      withdrawnDate: this.parseStringField(row, CSV_KEYS.WITHDRAWN_DATE, rowNumber),
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
      ),
      publications: this.parsePublication(row),
      contributions,
    });

    this.parsedWorks.push(parsedWork);
    this.parseSeries(row, parsedWork);
  }

  private parseStringField(row: Row, field: keyof Row, rowNumber?: number) {
    const value = row[field];

    if (value === undefined) return '';

    if (typeof value !== 'string') {
      this.errors.push(this.t('errors.csvFieldNotString', { field, row: rowNumber ?? '' }));

      return '';
    }

    return value;
  }

  private parseNumberField(row: Row, field: keyof Row, rowNumber?: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return 0;
    }

    const numberValue = parseInt(value);

    if (isNaN(numberValue)) {
      this.errors.push(this.t('errors.csvFieldNotNumber', { field, row: rowNumber ?? '' }));

      return 1;
    }

    return numberValue;
  }

  private parseFloatNumberField(row: Row, field: keyof Row, rowNumber?: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return 0;
    }

    const numberValue = parseFloat(value);

    if (isNaN(numberValue)) {
      this.errors.push(this.t('errors.csvFieldNotNumber', { field, row: rowNumber ?? '' }));

      return 0;
    }

    return numberValue;
  }

  private parseImprint(row: Row, rowNumber: number) {
    const imprintName = this.parseStringField(row, CSV_KEYS.IMPRINT, rowNumber);

    const imprint = this.imprints.find((imprint) => imprint.label === imprintName);

    if (!imprint) {
      this.errors.push(this.t('errors.csvImprintNotFound', { name: imprintName, row: rowNumber }));
      return '';
    }

    return imprint.value;
  }

  private parsePageBreakdownField(row: Row, field: keyof Row, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    const [frontmatterCount = '', totalPages = '', backmatterCount = ''] = value.split('+');

    return {
      frontmatterCount: totalPages.length > 0 ? convertRomanToArabic(frontmatterCount) : 0,
      backmatterCount: totalPages.length > 0 ? convertRomanToArabic(backmatterCount) : 0,
      pageCount: totalPages.length > 0 ? parseInt(totalPages) : 0,
    };
  }

  private parseTitles(row: Row, rowNumber: number): TitleEntity[] {
    const title = this.parseStringField(row, CSV_KEYS.TITLE, rowNumber);
    const subtitle = this.parseStringField(row, CSV_KEYS.SUBTITLE, rowNumber);
    const fullTitle = compileFullTitle(title, subtitle);

    return [getDefaultTitle({ canonical: true, title, subtitle, fullTitle })];
  }

  private parseAbstracts(row: Row, rowNumber: number): AbstractEntity[] {
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

  private parseLicenseField(row: Row, field: keyof Row, rowNumber: number) {
    const value = this.parseStringField(row, field, rowNumber);

    if (value.length === 0) {
      return value;
    }

    const license = this.licenses.find((option) => option.value.startsWith(`${value}`));

    if (!license) {
      this.errors.push(this.t('errors.csvLicenseNotFound', { value, row: rowNumber }));

      return '';
    }

    return license.value;
  }

  private parseLanguages(
    row: Row,
    originalLanguage: keyof Row,
    translatedFromLanguage: keyof Row,
    translatedIntoLanguage: keyof Row,
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
    row: Row,
    themeSubjects: keyof Row,
    bicSubjects: keyof Row,
    bisacSubjects: keyof Row,
    lccSubjects: keyof Row,
    keywordSubjects: keyof Row,
  ) {
    const subjects: SubjectEntity[] = [];
    const themeSubjectsValue = this.parseStringField(row, themeSubjects)
      .split(',')
      .map((subject) => subject.trim());
    const bicSubjectsValue = this.parseStringField(row, bicSubjects)
      .split(',')
      .map((subject) => subject.trim());
    const bisacSubjectsValue = this.parseStringField(row, bisacSubjects)
      .split(',')
      .map((subject) => subject.trim());
    const lccSubjectsValue = this.parseStringField(row, lccSubjects)
      .split(',')
      .map((subject) => subject.trim());
    const keywordSubjectsValue = this.parseStringField(row, keywordSubjects)
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

  private parsePublication(row: Row) {
    const publications: PublicationEntity[] = [];

    const paperbackIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_PAPERBACK_ISBN);
    const paperbackCurrencyCode = this.parseStringField(row, CSV_KEYS.PUBLICATION_PAPERBACK_PRICE_1_CURRENCY_CODE);
    const paperbackUnitPrice = this.parseFloatNumberField(row, CSV_KEYS.PUBLICATION_PAPERBACK_PRICE_1_UNIT_PRICE);
    const isPaperbackPriceFilled = paperbackCurrencyCode.length !== 0 && paperbackUnitPrice !== 0;
    const hardbackIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_HARDBACK_ISBN);
    const hardbackCurrencyCode = this.parseStringField(row, CSV_KEYS.PUBLICATION_HARDBACK_PRICE_1_CURRENCY_CODE);
    const hardbackUnitPrice = this.parseFloatNumberField(row, CSV_KEYS.PUBLICATION_HARDBACK_PRICE_1_UNIT_PRICE);
    const isHardbackPriceFilled = hardbackCurrencyCode.length !== 0 && hardbackUnitPrice !== 0;
    const pdfIsbn = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_ISBN);
    const pdfLocationLandingPage = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_LOCATION_LANDING_PAGE);
    const pdfLocationFullTextUrl = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_LOCATION_FULL_TEXT_URL);
    const pdfLocationPlatform = this.parseStringField(row, CSV_KEYS.PUBLICATION_PDF_LOCATION_PLATFORM);
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

  private parseSeries(row: Row, work: WorkEntity) {
    const seriesName = this.parseStringField(row, CSV_KEYS.SERIES_NAME);

    if (seriesName.length === 0) {
      return;
    }

    const existingSeries = this.serieses.find((series) => series.name === seriesName);

    if (!existingSeries) {
      this.errors.push(this.t('errors.csvSeriesNotFound', { name: seriesName }));

      return;
    }

    const existingData = this.parsedSeries[existingSeries.id] ?? [];
    const orderNumber = this.parseNumberField(row, CSV_KEYS.SERIES_ISSUE_NUMBER);

    this.parsedSeries[existingSeries.id] = [...existingData, { ...work, orderNumber }];
  }

  private async parseContributors(row: Row, workId: WorkId) {
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

      const contributorFirstName = this.parseStringField(row, FIRST_NAME as keyof Row);
      const contributorLastName = this.parseStringField(row, LAST_NAME as keyof Row);
      const contributorRole = this.parseStringField(row, ROLE as keyof Row);
      const contributorBiography = this.parseStringField(row, BIOGRAPHY as keyof Row);
      const contributorOrcid = this.parseStringField(row, ORCID as keyof Row);
      const contributorWebsite = this.parseStringField(row, WEBSITE as keyof Row);
      const contributorAffiliationPosition = this.parseStringField(row, AFFILIATION_POSITION as keyof Row);
      const contributorAffiliationInstitutionRor = this.parseStringField(row, AFFILIATION_INSTITUTION_ROR as keyof Row);

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

      const [foundedContributors, foundedInstitutions] = await Promise.all([
        this.contributorService.getContributors(fullName),
        this.institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, affiliationInstitutionRor),
      ]);

      const institution = foundedInstitutions[0] ?? null;

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

    this.contributorsForSelection = { ...this.contributorsForSelection, ...contributorsForSelection };

    return workContributions;
  }

  private normalizeFile(): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });

        if (parsed.errors.length > 0 || !parsed.data.length) {
          resolve(this.csv);
          return;
        }

        const [headerRow, ...dataRows] = parsed.data;

        const normalizedHeaders = headerRow.map((h) =>
          h.trim().toLowerCase() === 'publisher' ? 'imprint' : h.trim(),
        );

        const headerIndex = new Map<string, number>(normalizedHeaders.map((h, i) => [h, i]));

        type HeaderDef = { name: string };
        const configHeaders = (this.csvConfig as { headers: HeaderDef[] }).headers;

        const ENUM_COLUMN_MAPS: Record<string, Map<string, string>> = {
          work_type: buildEnumAliasMap(GQLWorkType as unknown as Record<string, string>),
          work_status: buildEnumAliasMap(GQLWorkStatus as unknown as Record<string, string>),
          publication_pdf_location_platform: buildEnumAliasMap(
            GQLLocationPlatform as unknown as Record<string, string>,
          ),
        };
        for (let i = 1; i <= appConfig.maxCsvContributorsCount; i++) {
          ENUM_COLUMN_MAPS[`contribution_${i}_role`] = buildEnumAliasMap(
            GQLContributionType as unknown as Record<string, string>,
          );
        }

        const normalizeEnumValue = (columnName: string, value: string) => {
          const aliasMap = ENUM_COLUMN_MAPS[columnName];
          if (!aliasMap || value.trim() === '') return value;
          return aliasMap.get(value.trim().toLowerCase()) ?? value;
        };

        const rewriteRow = (row: string[]) =>
          configHeaders.map(({ name }) => {
            const pos = headerIndex.get(name);
            const raw = pos !== undefined ? (row[pos] ?? '') : '';
            return normalizeEnumValue(name, raw);
          });

        const newRows = [configHeaders.map((h) => h.name), ...dataRows.map(rewriteRow)];
        const newCsv = Papa.unparse(newRows);

        resolve(new File([newCsv], this.csv.name, { type: this.csv.type }));
      };
      reader.onerror = () => resolve(this.csv);
      reader.readAsText(this.csv);
    });
  }

  private generateId() {
    return uuidv4();
  }
}

export default CSVParser;
