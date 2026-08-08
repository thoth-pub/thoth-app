import {
  LanguageRole,
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  ProductRelation,
  PublishingDateRole,
  TextType,
  TitleElementLevel,
  TitleType,
  WebsiteRole,
} from '@5stones/onix/dist/enums';
import isbn3 from 'isbn3';
import { v4 as uuidv4 } from 'uuid';

import { CurrencyCode, LanguageCode, LocaleCode } from '@/gql/graphql';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorService } from '@/src/entities/contributor';
import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import { InstitutionService } from '@/src/entities/institution';
import { LanguageEntity } from '@/src/entities/language/model/language.types';
import { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { SubjectEntity } from '@/src/entities/subject/model/subject.types';
import { WorkEntity, WorkId, WorkStatus } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import {
  getDefaultAffiliation,
  getDefaultContribution,
  LanguageRelation,
  LanguageTypeAlt,
  LocationPlatforms,
  SubjectTypes,
  WorkStatuses,
  WorkTypes,
} from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { ERRORS } from '../../constants/errors';
import { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ContributorsForSelection,
  ImportIssue,
  ImportIssueSource,
  ImportParseResult,
  LocaleCodeType,
  SeriesImportPlan,
  TitleEntity,
} from '../../types';
import {
  canonicaliseDoi,
  getContributorRoleFromXml,
  getDefaultAbstract,
  getDefaultChapter,
  getDefaultFunding,
  getDefaultPublication,
  getDefaultTitle,
  getDefaultWork,
  getPublicationType,
  getWorkStatusFromXml,
  isValidPublicationForm,
  localeFromLanguageCode,
} from '../../utils';
import { createEmptyImportPlan } from '../../utils/importPlan';
import { importStatus, sortIssues } from '../issues/importIssues';
import {
  buildSeriesPlan,
  resolveSeriesCandidate,
  type SeriesCandidate,
  type SeriesPlanMessages,
} from '../series/seriesPlan';
import {
  ExtendedContributor,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  OnixRelatedIdentifier,
  OnixRelatedProduct,
} from './interfaces';
import {
  classifyCollectionType,
  extractOnixTitle,
  extractOnixTitlesOfType,
  getOnixLanguage,
  getOnixText,
  selectPublicationOrderSequence,
  selectRelatedIdentifier,
  selectSeriesCollection,
  toOnixArray,
} from './onix';

/**
 * The `IDTypeName` Thoth's ONIX exporter gives the proprietary identifier that holds a reference's
 * unstructured citation. Compared lower-cased, so a sender's capitalisation does not matter.
 */
const UNSTRUCTURED_CITATION_NAME = 'unstructured citation';

/**
 * How ONIX language roles (List 22) map onto Thoth's LanguageRelation.
 *
 * Thoth records the language a work's text is in as `Original`, and the source language of
 * a translation as `TranslatedFrom` — see `useCreateWorkTranslation`, which re-tags an
 * original work's `Original` languages as `TranslatedFrom` on the derived translation, and
 * the CSV importer, which offers `Original`, `TranslatedFrom` and `TranslatedInto` as three
 * independent columns on a single work.
 *
 * Roles that are absent from this table (rights languages, language of abstracts, audio and
 * subtitle languages, …) describe something other than the language of the work's text and
 * have no Thoth equivalent, so they are ignored rather than forced into a relation.
 */
const LANGUAGE_ROLE_RELATIONS: Partial<Record<LanguageRole, LanguageEntity['relation']>> = {
  // Language of text.
  [LanguageRole._01]: LanguageRelation.enum.Original,
  // Original language of a translated text.
  [LanguageRole._02]: LanguageRelation.enum.TranslatedFrom,
  // Original language in a multilingual edition.
  [LanguageRole._06]: LanguageRelation.enum.Original,
  // Translated language in a multilingual edition.
  [LanguageRole._07]: LanguageRelation.enum.TranslatedInto,
};

/** What {@link XMLParser.parseWork} produces for one ONIX product. */
type ParsedProduct = {
  work: WorkEntity;
  chapters: WorkEntity[];
  seriesCandidate?: SeriesCandidate;
};

/** How the shared series planner phrases its errors for an ONIX import. */
const ONIX_SERIES_MESSAGES: SeriesPlanMessages = {
  validationCode: 'onix.validation',
  ambiguousMatch: ({ name, count, source }) =>
    `Series "${name}" matches ${count} existing Thoth series in the same imprint for ${source}`,
  conflictingMatches: ({ name, sources }) =>
    `Series "${name}" matches more than one existing Thoth series for ${sources}`,
  duplicateOrdinal: ({ name, ordinal, sources }) =>
    `Series "${name}" is given issue number ${ordinal} by more than one product: ${sources}`,
  ordinalAlreadyInThoth: ({ name, ordinal, sources }) =>
    `Series "${name}" already has issue number ${ordinal} in Thoth, supplied again by ${sources}`,
};

class XMLParser {
  private xml: ExtendedONIXMessageRoot;
  /**
   * Issues carry the product they came from because products are parsed concurrently: without
   * it the order shown in the UI would depend on which product happened to finish first.
   */
  private issues: ImportIssue[] = [];
  private parsedWorks: WorkEntity[] = [];
  private parsedSeries: SeriesImportPlan = [];
  private parsedChapters: WorkEntity[] = [];
  private contributorsForSelection: ContributorsForSelection = {};
  private imprints: FormFieldOption[] = [];
  private licenses: FormFieldOption[] = [];
  private languages: FormFieldOption[] = [];
  private serieses: SeriesEntity[] = [];
  private currencyOptions: FormFieldOption[] = [];
  private defaultId: string = appConfig.defaultId;
  private doiPrefix: string = appConfig.validations.doiPrefix;
  private contributorService: ContributorService;
  private institutionService: InstitutionService;

  constructor(
    xml: ExtendedONIXMessageRoot,
    imprints: FormFieldOption[],
    licenses: FormFieldOption[],
    serieses: SeriesEntity[],
    contributorService: ContributorService,
    institutionService: InstitutionService,
    languages: FormFieldOption[],
    currencyOptions: FormFieldOption[],
  ) {
    this.xml = xml;
    this.imprints = imprints;
    this.licenses = licenses;
    this.serieses = serieses;
    this.languages = languages;
    this.currencyOptions = currencyOptions;
    this.contributorService = contributorService;
    this.institutionService = institutionService;
  }

  async parse(): Promise<ImportParseResult> {
    try {
      const products = this.convertToArray(this.xml.ONIXMessage.Product).filter((product) => !!product);

      if (products.length === 0) {
        return {
          status: 'failed',
          data: this.emptyData(),
          issues: [
            {
              severity: 'error',
              code: 'onix.no_products',
              message: 'No products found in XML file',
              source: { kind: 'file' },
            },
          ],
        };
      }

      const promises = products.map((product, index) => this.parseWork(product, index + 1, WorkTypes.enum.EditedBook));

      // `Promise.all` resolves in input order regardless of completion order, so collecting
      // the results here — rather than letting each concurrent `parseWork` push into shared
      // state — keeps works, chapters and series ordinals in ONIX product order.
      const parsedProducts = await Promise.all(promises);

      this.parsedWorks = parsedProducts.map(({ work }) => work);
      this.parsedChapters = parsedProducts.flatMap(({ chapters }) => chapters);

      const { plan, issues } = buildSeriesPlan(
        parsedProducts.map(({ work, seriesCandidate }) => ({ work, candidate: seriesCandidate })),
        this.serieses,
        ONIX_SERIES_MESSAGES,
      );

      this.parsedSeries = plan;

      // The planner tags its issues with a source index, which for ONIX is the product
      // position; the product itself supplies the RecordReference that makes it identifiable.
      const sourceByIndex = new Map(
        products.map((product, index) => [index + 1, this.productSource(product, index + 1)] as const),
      );

      issues.forEach(({ index, severity, code, message }) =>
        this.issues.push({ severity, code, message, source: sourceByIndex.get(index) ?? { kind: 'file' } }),
      );

      const sortedIssues = sortIssues(this.issues);

      if (importStatus(sortedIssues) === 'failed') {
        return { status: 'failed', data: this.emptyData(), issues: sortedIssues };
      }

      // Warnings do not withhold a plan: the works a warning describes are imported, minus
      // whatever the warning says will not be represented.
      return {
        status: 'success',
        data: {
          plan: { works: this.parsedWorks, chapters: this.parsedChapters, series: this.parsedSeries },
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
            code: 'onix.parsing_failed',
            message: ERRORS.XML_PARSING_ERROR,
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

  private convertToArray<T>(data: T | T[]): T[] {
    return toOnixArray(data);
  }

  /**
   * Where a product-level issue came from: its position in the message, plus the publisher's own
   * RecordReference when the record carries one.
   */
  private productSource(product: ExtendedProduct, index: number): ImportIssueSource {
    const recordReference = getOnixText(product.RecordReference);

    return {
      kind: 'onix',
      productIndex: index,
      ...(recordReference.length > 0 ? { recordReference } : {}),
    };
  }

  /**
   * A product-scoped validation error, which blocks the import.
   *
   * This is the blocking path only. Warnings — which let the import proceed while saying what
   * will not be represented — are pushed onto the same list from wherever the loss is noticed:
   * `parseReferences` for a citation Thoth cannot store, and the shared series planner, which has
   * the whole group in hand and phrases its own once.
   */
  private pushError(product: ExtendedProduct, index: number, message: string) {
    this.issues.push({
      severity: 'error',
      code: 'onix.validation',
      message,
      source: this.productSource(product, index),
    });
  }

  /**
   * ONIX composites that are repeatable are objects when they occur once, so `.find` is only
   * safe after normalising. A product with a single ProductIdentifier used to throw and fail
   * the whole import with an opaque parsing error.
   */
  private findProductIdentifier(product: ExtendedProduct, type: ProductIdentifierType): string {
    const identifiers = this.convertToArray(product.ProductIdentifier).filter((identifier) => !!identifier);

    return getOnixText(identifiers.find((identifier) => identifier.ProductIDType === type)?.IDValue);
  }

  /**
   * A short, human-readable handle for a product, used to make import errors actionable.
   * Prefers the publisher's own RecordReference and falls back to the ISBN-13.
   */
  private describeProduct(product: ExtendedProduct, index: number): string {
    const recordReference = getOnixText(product.RecordReference);
    const isbn = this.findProductIdentifier(product, ProductIdentifierType._15);
    const reference = recordReference.length > 0 ? recordReference : isbn;

    return reference.length > 0 ? `product ${index} (${reference})` : `product ${index}`;
  }

  private async parseWork(
    product: ExtendedProduct,
    index: number,
    workType = WorkTypes.enum.EditedBook,
  ): Promise<ParsedProduct> {
    const workId = this.generateId();
    const imprintId = this.parseImprint(product, index);

    const { imageCount, tableCount, audioCount, videoCount } = this.parseMedia(product);
    const { publicationDate, withdrawnDate } = this.parseDates(product);
    const languages = this.parseLanguages(product, index);
    const textLocale = this.parseTextLocale(product);
    const fundings = await this.parseFundings(product);
    const workContributors = product.DescriptiveDetail?.Contributor ?? [];
    const workContributions = await this.parseContributors(workContributors, workId);

    const work = getDefaultWork({
      id: workId,
      status: this.parseWorkStatus(product),
      type: workType,
      imprintId,
      doi: this.parseDoi(product),
      lccn: this.parseLccn(product),
      oclc: this.parseOclc(product),
      license: this.parseLicense(product, index),
      copyrightHolder: this.parseCopyrightHolder(product),
      titles: this.parseTitle(product, textLocale),
      edition: this.parseEdition(product),
      bibliographyNote: this.parseBibliographyNote(product),
      generalNote: this.parseGeneralNote(product),
      abstracts: this.parseAbstracts(product, textLocale),
      pageCount: this.parsePageCount(product),
      imageCount,
      tableCount,
      audioCount,
      videoCount,
      publicationDate,
      withdrawnDate,
      landingPage: this.parseLandingPage(product),
      subjects: this.parseSubjects(product),
      fundings,
      languages,
      publications: this.parsePublications(product, index),
      references: this.parseReferences(product, index),
      contributions: workContributions,
    });

    const chapters = await this.parseChapters(product, work, textLocale);

    return { work, chapters, seriesCandidate: this.parseSeries(product, index, imprintId) };
  }

  private parseImprint(product: ExtendedProduct, index: number) {
    const xmlImprint = product.PublishingDetail?.Imprint?.ImprintName ?? '';
    const imprint = this.imprints.find((imprint) => imprint.label === xmlImprint);

    if (!imprint) {
      this.pushError(product, index, `Imprint ${xmlImprint} not found for product ${index}`);
      return '';
    }

    return imprint.value;
  }

  private parseDoi(product: ExtendedProduct) {
    const doi = this.findProductIdentifier(product, ProductIdentifierType._06);

    return doi.length > 0 ? this.doiPrefix + doi : '';
  }

  private parseLccn(product: ExtendedProduct) {
    return this.findProductIdentifier(product, ProductIdentifierType._13);
  }

  private parseOclc(product: ExtendedProduct) {
    return this.findProductIdentifier(product, ProductIdentifierType._23);
  }

  /**
   * The locale of the product's own text, used wherever ONIX declines to tag a title or an
   * abstract with a language of its own.
   *
   * Only the language of text (LanguageRole 01) is considered, plus an untagged Language for the
   * same reason {@link parseLanguages} accepts one: ONIX makes the role mandatory and files omit
   * it anyway. A translated-from or rights language says nothing about what language the title is
   * written in. The answer has to be unambiguous — a multilingual edition declaring two languages
   * of text gives no basis for choosing one, so it gives nothing.
   *
   * Ambiguity is decided from what the file declared, not from what could be mapped. A product
   * declaring `fre` and `nor` is a bilingual product whichever way Thoth models Norwegian, so it
   * must not resolve to French merely because `nor` has no Thoth locale to collide with.
   *
   * Declarations are keyed by their locale where they have one, so duplicates collapse on what
   * they mean rather than on how they are spelled — two spellings of one language would count
   * once, out of the existing canonicalisation rather than a table of aliases. In practice Thoth's
   * own language list is ISO 639-2/B only, so a product carrying both `fre` and `fra` fails
   * `parseLanguages` before this matters; the keying is what keeps the rule principled rather
   * than a behaviour to rely on. A declaration with no locale keeps its own code as its key, which
   * is what keeps it in the count.
   */
  private parseTextLocale(product: ExtendedProduct): LocaleCodeType | undefined {
    const xmlLanguages = this.convertToArray(product.DescriptiveDetail?.Language).filter((language) => !!language);
    const declarations = new Map<string, LocaleCodeType | undefined>();

    xmlLanguages
      .filter((language) => {
        const role = getOnixText(language.LanguageRole);

        return role.length === 0 || role === LanguageRole._01;
      })
      .map((language) => getOnixText(language.LanguageCode).trim().toLowerCase())
      .filter((code) => code.length > 0)
      .forEach((code) => {
        const locale = localeFromLanguageCode(code);

        declarations.set(locale ?? code, locale);
      });

    return declarations.size === 1 ? [...declarations.values()][0] : undefined;
  }

  /**
   * The Thoth locale for one piece of ONIX text.
   *
   * ONIX carries an ISO 639 language code, Thoth stores a BCP-47 locale, and the conversion back
   * is lossy in a way no importer can undo: `eng` may have been `en`, `en-GB` or `en-US` before
   * Thoth's exporter flattened it. `localeFromLanguageCode` therefore recovers the base locale
   * only, and this adds the two fallbacks in the order the evidence justifies: what the element
   * itself says, then what the product says its text is in, then English — which is what every
   * ONIX import used to get unconditionally.
   */
  private resolveLocale(language: string, textLocale: LocaleCodeType | undefined): LocaleCodeType {
    return localeFromLanguageCode(language) ?? textLocale ?? LanguageTypeAlt.enum.En;
  }

  /**
   * The work's titles: the distinctive title, plus any titles in another language.
   *
   * ONIX TitleType separates these. 01 is the distinctive title and stays the canonical Thoth
   * title — that preference is what keeps a publisher's internal working title (05) out of the
   * catalogue. 06 is "title in another language", which is exactly what Thoth's own exporter
   * writes for a non-canonical title, so those come back as non-canonical titles in the order
   * ONIX listed them. No other title type is imported: an abbreviated title or an expanded title
   * is not a title in another language, and Thoth has nowhere to put it.
   */
  private parseTitle(product: ExtendedProduct, textLocale: LocaleCodeType | undefined): TitleEntity[] {
    const titleDetail = product.DescriptiveDetail?.TitleDetail;
    const canonical = extractOnixTitle(titleDetail, TitleElementLevel._01);

    const titles = [
      getDefaultTitle({
        canonical: true,
        title: canonical.title,
        subtitle: canonical.subtitle,
        fullTitle: canonical.fullTitle,
        localeCode: this.resolveLocale(canonical.language, textLocale),
      }),
    ];

    const alternates = extractOnixTitlesOfType(titleDetail, TitleElementLevel._01, TitleType._06)
      // A product whose only product-level title is a Type 06 has that title as its canonical
      // one — a work must have a title — so it must not be repeated as a non-canonical row.
      .filter((alternate) => canonical.titleType !== TitleType._06 || alternate.fullTitle !== canonical.fullTitle);

    alternates.forEach((alternate) => {
      titles.push(
        getDefaultTitle({
          canonical: false,
          title: alternate.title,
          subtitle: alternate.subtitle,
          fullTitle: alternate.fullTitle,
          // Each title answers for its own language: an alternate that says it is French does not
          // inherit the canonical title's locale, and one that says nothing falls back on the
          // product's language of text rather than on the canonical title's guess.
          localeCode: this.resolveLocale(alternate.language, textLocale),
        }),
      );
    });

    return titles;
  }

  private parseEdition(product: ExtendedProduct): number {
    const edition = parseInt(product.DescriptiveDetail?.Edition?.EditionNumber ?? '1');

    return edition;
  }

  /**
   * The work's abstracts, each in the language its own TextContent claims.
   *
   * The two abstracts are read from separate TextContent composites, so each resolves its locale
   * from its own Text element. Neither inherits the other's: a file that supplies an English
   * short description alongside a French description is describing two languages, not one.
   */
  private parseAbstracts(product: ExtendedProduct, textLocale: LocaleCodeType | undefined): AbstractEntity[] {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const longText = collateralDetailTextContent.find((text) => text?.TextType === TextType._03)?.Text;
    const shortText = collateralDetailTextContent.find((text) => text?.TextType === TextType._02)?.Text;
    const longAbstract = getOnixText(longText);
    const shortAbstract = getOnixText(shortText);
    const abstracts: AbstractEntity[] = [];

    if (longAbstract.length > 0) {
      abstracts.push(
        getDefaultAbstract({
          content: longAbstract,
          type: AbstractTypes.enum.Long,
          canonical: true,
          localeCode: this.resolveLocale(getOnixLanguage(longText), textLocale),
        }),
      );
    }

    if (shortAbstract.length > 0) {
      abstracts.push(
        getDefaultAbstract({
          content: shortAbstract,
          type: AbstractTypes.enum.Short,
          canonical: false,
          localeCode: this.resolveLocale(getOnixLanguage(shortText), textLocale),
        }),
      );
    }

    return abstracts;
  }

  private parseLicense(product: ExtendedProduct, index: number) {
    const enteredLicense =
      product.DescriptiveDetail?.EpubLicense?.EpubLicenseExpression?.EpubLicenseExpressionLink ?? '';
    const license = this.licenses.find((option) => option.value.startsWith(enteredLicense));

    if (!license) {
      this.pushError(product, index, `License ${enteredLicense} not found for product ${index}`);
      return '';
    }

    return license.value;
  }

  private parseBibliographyNote(product: ExtendedProduct): string {
    const note = product.DescriptiveDetail?.IllustrationsNote?.IllustrationsNoteText ?? '';

    return note;
  }

  private parseGeneralNote(product: ExtendedProduct): string {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const note = getOnixText(collateralDetailTextContent.find((text) => text?.TextType === TextType._13)?.Text);

    return note;
  }

  private parseNumber(value: string): number {
    const parsedValue = parseInt(value);

    if (isNaN(parsedValue)) {
      return 0;
    }

    return parsedValue;
  }

  private parseFloatNumber(value: string): number {
    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) {
      return 0;
    }

    return parsedValue;
  }

  private parsePageCount(product: ExtendedProduct): number {
    const pageCount = product.DescriptiveDetail?.Extent?.ExtentValue ?? '';

    return this.parseNumber(pageCount);
  }

  private parseMedia(product: ExtendedProduct) {
    const ancillaryContent = this.convertToArray(product.DescriptiveDetail?.AncillaryContent).filter(
      (ancillary) => !!ancillary,
    );

    const imageCount = ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '09')?.Number ?? '';
    const tableCount = ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '11')?.Number ?? '';
    const audioCount = ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '19')?.Number ?? '';
    const videoCount = ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '00')?.Number ?? '';

    return {
      imageCount: this.parseNumber(imageCount.toString()),
      tableCount: this.parseNumber(tableCount.toString()),
      audioCount: this.parseNumber(audioCount.toString()),
      videoCount: this.parseNumber(videoCount.toString()),
    };
  }

  private parseWorkStatus(product: ExtendedProduct): WorkStatus {
    const workStatus = product.PublishingDetail?.PublishingStatus
      ? getWorkStatusFromXml(product.PublishingDetail?.PublishingStatus)
      : WorkStatuses.enum.Forthcoming;

    return workStatus;
  }

  private parseDates(product: ExtendedProduct) {
    const publicationDates = this.convertToArray(product.PublishingDetail?.PublishingDate).filter((date) => !!date);

    const publicationDate = getOnixText(
      publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._01)?.Date,
    );

    const withdrawnDate = getOnixText(
      publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._13)?.Date,
    );

    return {
      publicationDate,
      withdrawnDate,
    };
  }

  private parseCopyrightHolder(product: ExtendedProduct): string {
    const copyrightHolder = product.PublishingDetail?.CopyrightStatement?.CopyrightOwner?.PersonName ?? '';

    return copyrightHolder;
  }

  private parseLandingPage(product: ExtendedProduct): string {
    const publishers = this.convertToArray(product.PublishingDetail?.Publisher).filter((publisher) => !!publisher);
    const websites = publishers.flatMap((publisher) => this.convertToArray(publisher.Website).filter((w) => !!w));

    const websiteWithLandingPage = websites.find((website) => website.WebsiteRole === WebsiteRole._02);

    return getOnixText(websiteWithLandingPage?.WebsiteLink);
  }

  private parseSubjects(product: ExtendedProduct) {
    const subjects: SubjectEntity[] = [];
    const xmlSubjects = this.convertToArray(product.DescriptiveDetail?.Subject).filter((subject) => !!subject);

    const llcSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === '04');
    const bisacSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === '10');
    const bicSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === '12');
    const keywordSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === '20');
    const themaSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === '93');
    const customSubjects = xmlSubjects.filter((subject) => subject.SubjectSchemeIdentifier === 'B2');

    llcSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Lcc,
        ordinal: subjects.length + 1,
      });
    });

    bisacSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Bisac,
        ordinal: subjects.length + 1,
      });
    });

    bicSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Bic,
        ordinal: subjects.length + 1,
      });
    });

    keywordSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Keyword,
        ordinal: subjects.length + 1,
      });
    });

    themaSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Thema,
        ordinal: subjects.length + 1,
      });
    });

    customSubjects.forEach((subject) => {
      subjects.push({
        id: this.defaultId,
        code: subject.SubjectHeadingText ?? '',
        type: SubjectTypes.enum.Custom,
        ordinal: subjects.length + 1,
      });
    });

    const filteredSubjects = subjects.filter((subject) => subject.code.length > 0);

    return filteredSubjects;
  }

  private parseLanguages(product: ExtendedProduct, index: number) {
    // Language is repeatable in ONIX, so a product with an original language alongside its
    // language of text arrives as an array rather than a single composite.
    const xmlLanguages = this.convertToArray(product.DescriptiveDetail?.Language).filter((language) => !!language);
    const productDescription = this.describeProduct(product, index);
    const workLanguages: LanguageEntity[] = [];
    let hasUnknownCode = false;

    if (xmlLanguages.length === 0) {
      this.pushError(product, index, `Language not provided for ${productDescription}`);

      return workLanguages;
    }

    for (const xmlLanguage of xmlLanguages) {
      const enteredLanguageCode = getOnixText(xmlLanguage.LanguageCode);
      const role = getOnixText(xmlLanguage.LanguageRole) as LanguageRole;
      const relation = LANGUAGE_ROLE_RELATIONS[role];

      // ONIX makes LanguageRole mandatory; treat a missing one as the language of text so a
      // sloppy but otherwise usable record still imports.
      const resolvedRelation = role.length === 0 ? LanguageRelation.enum.Original : relation;

      // A role we cannot express in Thoth (rights, abstracts, audio, subtitles, …) is not an
      // error: the rest of the product is still importable.
      if (!resolvedRelation) continue;

      const language = this.languages.find(
        (option) =>
          option.label.toLowerCase() === enteredLanguageCode.toLowerCase() ||
          option.value.toLowerCase() === enteredLanguageCode.toLowerCase(),
      );

      if (!language) {
        this.pushError(product, index, `Language ${enteredLanguageCode} not found for ${productDescription}`);
        hasUnknownCode = true;
        continue;
      }

      const code = language.value as LanguageCode;
      const isDuplicate = workLanguages.some(
        (workLanguage) => workLanguage.code === code && workLanguage.relation === resolvedRelation,
      );

      if (isDuplicate) continue;

      workLanguages.push({ code, relation: resolvedRelation, id: this.defaultId });
    }

    // Every language role in the product describes something Thoth cannot store (rights,
    // abstracts, audio, …), so the work would silently end up with no language at all.
    if (workLanguages.length === 0 && !hasUnknownCode) {
      this.pushError(product, index, `No supported language role found for ${productDescription}`);
    }

    return workLanguages;
  }

  private async parseFundings(product: ExtendedProduct) {
    const fundings: FundingEntity[] = [];
    const publishers = this.convertToArray(product.PublishingDetail?.Publisher).filter((publisher) => !!publisher);
    const publishersWithFundings = publishers.filter((publisher) => publisher.PublishingRole === '16');

    const institutionsRors = publishersWithFundings.map((publisherWithFunding) => {
      const identifiers = this.convertToArray(publisherWithFunding.PublisherIdentifier).filter(
        (identifier) => !!identifier,
      );
      return identifiers.find((identifier) => identifier.PublisherIDType === '40')?.IDValue ?? '';
    });

    const institutionsPromises = institutionsRors.map((ror) => {
      return this.institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, ror);
    });

    const institutions = await Promise.all(institutionsPromises);
    const institutionsEntities = institutions.flatMap((institution) => institution);

    publishersWithFundings.forEach((publisherWithFunding) => {
      const identifiers = this.convertToArray(publisherWithFunding.PublisherIdentifier).filter(
        (identifier) => !!identifier,
      );
      const ror = identifiers.find((identifier) => identifier.PublisherIDType === '40')?.IDValue ?? '';

      if (!ror || ror.length === 0) return;

      const institution = institutionsEntities.find((institution) => institution.ror === ror);

      if (!institution) return;

      const publisherFundings = this.convertToArray(publisherWithFunding.Funding).filter((funding) => !!funding);

      publisherFundings.forEach((funding) => {
        const identifiers = this.convertToArray(funding.FundingIdentifier).filter((identifier) => !!identifier);
        const program = identifiers.find((identifier) => identifier?.IDTypeName === 'programname')?.IDValue ?? '';
        const projectName = identifiers.find((identifier) => identifier?.IDTypeName === 'projectname')?.IDValue ?? '';
        const projectShortname =
          identifiers.find((identifier) => identifier?.IDTypeName === 'projectshortname')?.IDValue ?? '';
        const grantNumber = identifiers.find((identifier) => identifier?.IDTypeName === 'grantnumber')?.IDValue ?? '';

        const newFunding = getDefaultFunding({
          program,
          projectName,
          projectShortname,
          grantNumber,
          institutionId: institution.id,
          institutionName: institution.name,
          institutionRor: institution.ror,
        });

        fundings.push(newFunding);
      });
    });

    return fundings;
  }

  private parsePublications(product: ExtendedProduct, index: number) {
    const publications: PublicationEntity[] = [];
    const descriptiveDetail = product.DescriptiveDetail;

    if (!descriptiveDetail) return publications;

    const productForm = descriptiveDetail.ProductForm;

    if (!productForm) return publications;

    const isValid = isValidPublicationForm(productForm);

    if (!isValid) return publications;

    const measures = this.convertToArray(descriptiveDetail.Measure).filter((measure) => !!measure);

    const height =
      measures.find((measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const heightIn =
      measures.find((measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const width =
      measures.find((measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const widthIn =
      measures.find((measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const depth =
      measures.find((measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const depthIn =
      measures.find((measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const weight =
      measures.find((measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.gr)
        ?.Measurement ?? 0;
    const weightOz =
      measures.find((measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.oz)
        ?.Measurement ?? 0;
    const isbn = this.findProductIdentifier(product, ProductIdentifierType._15);
    const isValidIsbn = isbn3.parse(isbn)?.isValid ?? false;

    const publication = getDefaultPublication({
      isbn: isValidIsbn ? isbn : '',
      type: getPublicationType(productForm),
      width: this.parseFloatNumber(width.toString()),
      widthIn: this.parseFloatNumber(widthIn.toString()),
      height: this.parseFloatNumber(height.toString()),
      heightIn: this.parseFloatNumber(heightIn.toString()),
      depth: this.parseFloatNumber(depth.toString()),
      depthIn: this.parseFloatNumber(depthIn.toString()),
      weight: this.parseFloatNumber(weight.toString()),
      weightOz: this.parseFloatNumber(weightOz.toString()),
      prices: [],
      locations: [],
    });

    const productSupply = product.ProductSupply;

    if (!productSupply || !productSupply.SupplyDetail || !productSupply.SupplyDetail.Price) {
      publications.push(publication);
      return publications;
    }

    // Prices
    const prices = this.convertToArray(productSupply.SupplyDetail.Price).filter((price) => !!price);

    prices.forEach((price) => {
      const currencyCode = this.currencyOptions.find(
        (option) => option.value.toLowerCase() === (price?.CurrencyCode?.toLowerCase() ?? ''),
      )?.value;

      if (!currencyCode) {
        this.pushError(
          product,
          index,
          `Currency code ${price?.CurrencyCode} not found for ${this.describeProduct(product, index)}`,
        );
        return;
      }

      publication.prices.push({
        id: this.defaultId,
        currencyCode: currencyCode as CurrencyCode,
        unitPrice: this.parseFloatNumber(price?.PriceAmount ?? '0'),
      });
    });

    if (!productSupply.SupplyDetail.Supplier) {
      publications.push(publication);
      return publications;
    }

    // Locations
    const supplierWebsites = this.convertToArray(productSupply.SupplyDetail.Supplier.Website).filter(
      (website) => !!website,
    );
    const landingPage = getOnixText(supplierWebsites.find((website) => website.WebsiteRole === '02')?.WebsiteLink);
    const fullTextUrl = getOnixText(supplierWebsites.find((website) => website.WebsiteRole === '29')?.WebsiteLink);
    const locationPlatform =
      LocationPlatforms.options.find(
        (option) => option.toLowerCase() === productSupply.Market?.Territory?.RegionsIncluded?.toLowerCase(),
      ) ?? LocationPlatforms.enum.Other;

    publication.locations.push({
      id: this.defaultId,
      canonical: true,
      landingPage,
      fullTextUrl,
      locationPlatform,
    });

    publications.push(publication);

    return publications;
  }

  /**
   * Resolves the ONIX Collection for one product into a series candidate.
   *
   * This is the ONIX adapter over the shared series planner: it supplies the series name, the
   * product's own creation policy and a CollectionSequenceNumber, and the planner applies the
   * matching rules. It is pure — grouping, conflict detection and ordinal assignment all happen
   * later in `buildSeriesPlan`, once every product has been parsed, so none of it depends on
   * which product finished first.
   *
   * Thoth's bulk import supports a single series membership per work, so exactly one
   * Collection is selected — see {@link selectSeriesCollection} for the rule.
   *
   * The name is the only signal handed to the planner: an ONIX Collection carries no identifier
   * this importer can map onto Thoth's series fields. See the follow-up note about
   * CollectionIdentifier.
   */
  private parseSeries(product: ExtendedProduct, index: number, imprintId: string): SeriesCandidate | undefined {
    const seriesCollections = this.convertToArray(product.DescriptiveDetail?.Collection).filter(
      (collection) => !!collection,
    );

    if (seriesCollections.length === 0) return undefined;

    // An ascribed collection is somebody else's grouping, not the publisher's series, so
    // selectSeriesCollection ignores it and the work simply imports without a series.
    const seriesCollection = selectSeriesCollection(seriesCollections);

    if (!seriesCollection) return undefined;

    const productDescription = this.describeProduct(product, index);
    const seriesName = extractOnixTitle(seriesCollection.TitleDetail, TitleElementLevel._02).title;

    if (seriesName.length === 0) {
      this.pushError(product, index, `Collection has no usable series title for ${productDescription}`);

      return undefined;
    }

    // Without a resolved imprint we can neither scope the identity nor create a series. The
    // unresolved imprint is already reported by parseImprint, so stay quiet here.
    if (imprintId.length === 0) return undefined;

    // Thoth's issue ordinal is the work's position in the series' publication order, so the
    // sequence that says so is the one to read — not whichever sequence came first.
    const sequenceSelection = selectPublicationOrderSequence(
      this.convertToArray(seriesCollection.CollectionSequence).filter((sequence) => !!sequence),
    );

    if (sequenceSelection.kind === 'conflict') {
      // Two publisher-supplied publication-order numbers for one work cannot both be right, and
      // picking one would make the import's output depend on the order of the file. The user is
      // the only one who can say which is meant.
      this.pushError(
        product,
        index,
        `Series "${seriesName}" is given more than one publication-order number (${sequenceSelection.ordinals.join(', ')}) by ${productDescription}`,
      );

      return undefined;
    }

    // Only a publisher collection is a safe basis for creating a Thoth series. An unspecified
    // or editorial-line collection may well be one, so it is still matched below, but we will
    // not invent a series from it.
    const support = classifyCollectionType(seriesCollection.CollectionType);

    const resolved = resolveSeriesCandidate(
      {
        name: seriesName,
        imprintId,
        sourceIndex: index,
        sourceDescription: productDescription,
        ordinal: sequenceSelection.kind === 'ordinal' ? sequenceSelection.ordinal : undefined,
        creation:
          support === 'supported'
            ? { allowed: true }
            : {
                allowed: false,
                // Not knowing whether a collection is the publisher's own series is a reason not
                // to create one, not a reason to refuse the work. The collection is still real
                // ONIX metadata — CollectionType 11 in particular is a genuine editorial line —
                // so the work imports and the user is told what was left behind, rather than
                // having a whole upload blocked by a code list value they may not control.
                severity: 'warning',
                code: 'onix.series.non_publisher_collection_skipped',
                reason: ({ name, sources }) =>
                  `Series "${name}" does not exist in Thoth and will not be created, because its ONIX CollectionType is not a publisher collection (10). ${sources} will be imported without this series association`,
              },
      },
      this.serieses,
      ONIX_SERIES_MESSAGES,
    );

    if ('issue' in resolved) {
      const { severity, code, message } = resolved.issue;

      this.issues.push({ severity, code, message, source: this.productSource(product, index) });

      return undefined;
    }

    return resolved.candidate;
  }

  /**
   * The identifiers of one RelatedProduct, normalised.
   *
   * ProductIdentifier is repeatable, and Thoth's own exporter repeats it: an alternative-format
   * RelatedProduct carries the ISBN-13 and the GTIN-13 of the same book. Reading `.ProductIDType`
   * off the composite without normalising would see an array and match nothing.
   */
  private relatedIdentifiers(relatedProduct: OnixRelatedProduct) {
    return this.convertToArray(relatedProduct.ProductIdentifier).filter((identifier) => !!identifier);
  }

  /**
   * Whether a proprietary identifier is the one Thoth means as a citation.
   *
   * ProductIDType 01 is "proprietary", which is a container for whatever the sender wants: a
   * publisher's product code, an internal SKU, a distributor's key. Thoth's exporter narrows it
   * with `IDTypeName` "Unstructured citation", and that name is the only thing distinguishing a
   * citation from a stock number, so reading any proprietary identifier as citation text would
   * put a SKU in a bibliography. The comparison tolerates case and surrounding whitespace and
   * nothing else — an identifier with no name at all is not a citation.
   */
  private isUnstructuredCitation(identifier: OnixRelatedIdentifier): boolean {
    return (
      getOnixText(identifier.ProductIDType) === ProductIdentifierType._01 &&
      getOnixText(identifier.IDTypeName).trim().toLowerCase() === UNSTRUCTURED_CITATION_NAME
    );
  }

  /** Says what one cited product lost, without failing the work over it. */
  private warnAboutCitation(
    product: ExtendedProduct,
    index: number,
    kind: 'unrepresentable' | 'unusable_identifier',
    detail: string,
  ) {
    this.issues.push({
      severity: 'warning',
      code:
        kind === 'unrepresentable' ? 'onix.reference.unrepresentable_citation' : 'onix.reference.unusable_identifier',
      message: `A cited work in ${this.describeProduct(product, index)} ${detail}`,
      source: this.productSource(product, index),
    });
  }

  /**
   * The DOI of one cited product, in the form Thoth stores, or nothing.
   *
   * A malformed value is dropped rather than dressed up: prefixing a resolver onto whatever
   * arrived used to turn `not-a-doi` into `https://doi.org/not-a-doi`, which survives the import
   * and fails at the API, where the Doi scalar parses it. The work is still importable without
   * one cited work's DOI, so this warns and carries on.
   */
  private resolveReferenceDoi(identifiers: OnixRelatedIdentifier[], product: ExtendedProduct, index: number): string {
    const selection = selectRelatedIdentifier(
      identifiers,
      (identifier) => getOnixText(identifier.ProductIDType) === ProductIdentifierType._06,
    );

    if (selection.kind === 'none') return '';

    if (selection.kind === 'conflict') {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies more than one DOI (${selection.values.join(', ')}), so the reference was imported without one`,
      );

      return '';
    }

    const doi = canonicaliseDoi(selection.value);

    if (doi.length === 0) {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies "${selection.value}" as a DOI, which Thoth cannot read as one, so the reference was imported without it`,
      );
    }

    return doi;
  }

  /** The unstructured citation of one cited product, or nothing. */
  private resolveReferenceCitation(
    identifiers: OnixRelatedIdentifier[],
    product: ExtendedProduct,
    index: number,
  ): string {
    const selection = selectRelatedIdentifier(identifiers, (identifier) => this.isUnstructuredCitation(identifier));

    if (selection.kind === 'value') return selection.value;

    if (selection.kind === 'conflict') {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        'supplies more than one unstructured citation, so the reference was imported without one',
      );
    }

    return '';
  }

  /**
   * The works this work cites, as Thoth references.
   *
   * ONIX RelatedMaterial holds every kind of relationship a product can have, and only one of
   * them is a bibliographic citation: ProductRelationCode 34, "cites", which is what Thoth's own
   * exporter writes for a ReferenceEntity. Everything else there describes a different book or a
   * different edition of this one — an alternative format (06), a part (01/02), a replacement
   * (03/05), a translation — and turning those into references filled works with citations of
   * their own paperback. They are left alone until Thoth's work relations are imported properly.
   *
   * RelatedWork is skipped for the same reason: ONIX List 164 has no citation relation at all, so
   * a RelatedWork is never a reference.
   */
  private parseReferences(product: ExtendedProduct, index: number) {
    const references: ReferenceEntity[] = [];
    const citations = this.convertToArray(product.RelatedMaterial?.RelatedProduct)
      .filter((relatedProduct) => !!relatedProduct)
      .filter((relatedProduct) => getOnixText(relatedProduct.ProductRelationCode) === ProductRelation._34);

    citations.forEach((citation) => {
      const identifiers = this.relatedIdentifiers(citation);
      const doi = this.resolveReferenceDoi(identifiers, product, index);
      const unstructuredCitation = this.resolveReferenceCitation(identifiers, product, index);

      if (doi.length === 0 && unstructuredCitation.length === 0) {
        this.warnAboutCitation(
          product,
          index,
          'unrepresentable',
          'carries no citation metadata Thoth can represent, so the reference was skipped',
        );

        return;
      }

      references.push({
        id: this.defaultId,
        doi,
        journalTitle: '',
        articleTitle: '',
        seriesTitle: '',
        volumeTitle: '',
        url: '',
        orderNumber: references.length + 1,
        unstructuredCitation,
      });
    });

    return references;
  }

  private async parseContributors(contributors: ExtendedContributor[] | ExtendedContributor, workId: WorkId) {
    const xmlContributors = this.convertToArray(contributors).filter((contributor) => !!contributor);

    if (xmlContributors.length === 0) return [];

    const multipleContributions: ContributorsForSelection = {
      [workId]: {},
    };

    const workContributions: WorkContribution[] = [];

    for (const contributor of xmlContributors) {
      const role = getContributorRoleFromXml(contributor.ContributorRole ?? '01');
      const fullName = contributor.PersonName ?? '';
      const lastName = contributor.KeyNames ?? '';
      const firstName = contributor.NamesBeforeKey ?? '';
      const orcid = contributor.NameIdentifier?.IDValue ?? '';
      const website = contributor.Website?.WebsiteLink ?? '';
      const affiliationPosition = contributor.ProfessionalAffiliation?.ProfessionalPosition ?? '';
      const affiliationInstitutionRor = contributor.ProfessionalAffiliation?.AffiliationIdentifier?.IDValue;
      const position = contributor.ProfessionalAffiliation?.ProfessionalPosition ?? '';
      const biography = contributor.BiographicalNote ?? '';

      const newContributor = {
        lastName,
        firstName,
        fullName,
        orcid,
        website,
        type: role,
        affiliationPosition,
        affiliationInstitutionRor,
        position,
        biography,
      };

      if (newContributor.fullName.length === 0) continue;

      const institutions = await this.institutionService.getInstitutions(
        0,
        appConfig.data.maxItemsPerRequestLimit,
        `${affiliationInstitutionRor}`,
      );

      const foundedInstitutions = institutions.find((institution) => institution.ror === affiliationInstitutionRor);

      const affiliation = foundedInstitutions
        ? getDefaultAffiliation({
            institutionId: foundedInstitutions.id,
            institutionName: foundedInstitutions.name,
            rorId: foundedInstitutions.ror,
            position: affiliationPosition,
          })
        : null;

      const biographies = biography
        ? [
            {
              id: this.defaultId,
              canonical: true,
              content: `${biography}`,
              localeCode: LocaleCode.En,
              contributionId: this.defaultId,
            },
          ]
        : [];

      const contributionWithNewContributor = getDefaultContribution({
        fullName,
        lastName,
        firstName,
        type: role,
        isMain: true,
        orderNumber: 1,
        biographies,
        orcidId: orcid ? `${orcid}` : '',
        website: website ? `${website}` : '',
        contributorId: this.defaultId,
        affiliations: affiliation ? [affiliation] : [],
      });

      workContributions.push(contributionWithNewContributor);

      const multipleContributionsItemId = this.generateId();

      multipleContributions[workId][multipleContributionsItemId] = [
        { ...contributionWithNewContributor, selected: true, lastContribution: '' },
      ];

      const foundedContributors = await this.contributorService.getContributors(newContributor.fullName);

      if (foundedContributors.length === 0) continue;

      foundedContributors.forEach((foundedContributor) => {
        const contribution = getDefaultContribution({
          fullName: foundedContributor.fullName,
          lastName: foundedContributor.lastName,
          firstName: foundedContributor.firstName,
          contributorId: foundedContributor.id,
          type: role,
          isMain: true,
          orderNumber: 1,
          biographies,
          orcidId: foundedContributor.orcid,
          website: foundedContributor.website,
          affiliations: affiliation ? [affiliation] : [],
        });

        workContributions.push(contribution);

        multipleContributions[workId][multipleContributionsItemId].push({
          ...contribution,
          selected: false,
          lastContribution: foundedContributor.lastContributionTitle,
        });
      });
    }

    this.contributorsForSelection = { ...this.contributorsForSelection, ...multipleContributions };

    return workContributions;
  }

  private async parseChapters(
    product: ExtendedProduct,
    relatedWork: WorkEntity,
    textLocale: LocaleCodeType | undefined,
  ) {
    const {
      id: workId,
      status,
      license,
      imprintId,
      copyrightHolder,
      edition,
      publicationDate,
      withdrawnDate,
    } = relatedWork;

    const chapterCollections = this.convertToArray(product.ContentDetail?.ContentItem).filter(
      (collection) => !!collection,
    );

    const newChapters: WorkEntity[] = [];

    const sortedChapters = chapterCollections.sort(
      (chapterA, chapterB) =>
        this.parseNumber(getOnixText(chapterA.LevelSequenceNumber)) -
        this.parseNumber(getOnixText(chapterB.LevelSequenceNumber)),
    );

    for (const chapter of sortedChapters) {
      const chapterId = this.generateId();
      const chapterDoi = chapter?.TextItem?.TextItemIdentifier?.IDValue ?? '';
      const { title: chapterTitleContent, language: chapterLanguage } = extractOnixTitle(
        chapter?.TitleDetail,
        TitleElementLevel._04,
      );

      const newChapter = getDefaultChapter({
        id: chapterId,
        status,
        doi: chapterDoi.length > 0 ? this.doiPrefix + chapterDoi : '',
        imprintId,
        license,
        copyrightHolder,
        titles: [
          getDefaultTitle({
            title: chapterTitleContent,
            // A content item's title follows the same rule as the product's: what it says, then
            // what the product says, then English.
            localeCode: this.resolveLocale(chapterLanguage, textLocale),
            fullTitle: chapterTitleContent,
          }),
        ],
        edition,
        publicationDate,
        withdrawnDate,
        relationId: workId,
        pageCount: this.parseNumber(getOnixText(chapter?.NumberOfPages)),
        firstPage: getOnixText(chapter?.PageRun?.FirstPageNumber),
        lastPage: getOnixText(chapter?.PageRun?.LastPageNumber),
        contributions: [],
      });

      const chapterContributors = chapter?.Contributor ?? [];

      const workContributions = await this.parseContributors(chapterContributors, newChapter.id);

      newChapter.contributions = workContributions;

      newChapters.push(newChapter);
    }

    return newChapters;
  }

  private generateId() {
    return uuidv4();
  }
}

export default XMLParser;
