import {
  LanguageRole,
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  ProductRelation,
  PublishingDateRole,
  TextItemIdentifierType,
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
import { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ContributorsForSelection,
  ImportedMarkupFormat,
  ImportIssue,
  ImportIssueSource,
  ImportParseResult,
  LocaleCodeType,
  SeriesImportPlan,
  TitleEntity,
} from '../../types';
import {
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
import { ImportLookupCoordinator } from '../importLookupCoordinator';
import { importStatus, sortIssues } from '../issues/importIssues';
import {
  buildSeriesPlan,
  resolveSeriesCandidate,
  type SeriesCandidate,
  type SeriesPlanMessages,
} from '../series/seriesPlan';
import {
  ExtendedCollection,
  ExtendedContributor,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  OnixRelatedIdentifier,
  OnixRelatedProduct,
  OnixText,
} from './interfaces';
import {
  classifyCollectionType,
  extractOnixTitle,
  extractOnixTitlesOfType,
  getOnixLanguage,
  getOnixText,
  getOnixTextFormat,
  isEarlierCalendarDate,
  MAX_ISSUE_ORDINAL,
  type OnixDateSelection,
  type OnixDoiSelection,
  resolveOnixTextMarkup,
  selectCanonicalDoi,
  selectPublicationOrderSequence,
  selectPublishingDate,
  selectRelatedIdentifier,
  selectSeriesCollection,
  toOnixArray,
} from './onix';

export const ONIX_PROCESSING_FAILURE_MESSAGE =
  'Thoth could not finish processing this ONIX file because an unexpected error occurred. The file itself may still be valid, and nothing has been created from this upload. Please try again; if the problem continues, report it to Thoth.';

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

type OnixSubjectRule = {
  scheme: string;
  type: SubjectEntity['type'];
  valueFrom: 'code' | 'heading';
};

/**
 * Supported ONIX List 27 subject schemes, in the grouping order the importer has always used.
 * Controlled schemes must never substitute a descriptive heading for a missing machine code.
 */
const ONIX_SUBJECT_RULES: readonly OnixSubjectRule[] = [
  { scheme: '04', type: SubjectTypes.enum.Lcc, valueFrom: 'code' },
  { scheme: '10', type: SubjectTypes.enum.Bisac, valueFrom: 'code' },
  { scheme: '12', type: SubjectTypes.enum.Bic, valueFrom: 'code' },
  { scheme: '20', type: SubjectTypes.enum.Keyword, valueFrom: 'heading' },
  { scheme: '93', type: SubjectTypes.enum.Thema, valueFrom: 'code' },
  { scheme: 'B2', type: SubjectTypes.enum.Custom, valueFrom: 'heading' },
];

/**
 * The work statuses `WorkProperties::validate` classifies, restated where the parser can apply
 * them.
 *
 * These are not a UI preference. `thoth-api/src/model/work/mod.rs` decides in four branches, all
 * of which this parser has to respect, because a plan that breaks one of them is a plan whose
 * `createWork` is already known to fail:
 *
 * - `PublicationDateError` — published (`is_published`) with no publication date;
 * - `WithdrawnDateError` — *not* out of print (`is_out_of_print`) but carrying a withdrawn date;
 * - `NoWithdrawnDateError` — out of print with no withdrawn date;
 * - `WithdrawnDateBeforePublicationDateError` — both present and `withdrawn < publication`.
 *
 * The middle two are one rule read from both sides: a withdrawn date is stored for exactly the
 * out-of-print statuses, so for those it is compulsory and for every other status it is refused.
 * A publication date is not symmetric — it is compulsory for a published work, but a forthcoming
 * work may perfectly well carry one, so only its absence is ever an error.
 */
const PUBLISHED_STATUSES: WorkStatus[] = [
  WorkStatuses.enum.Active,
  WorkStatuses.enum.Withdrawn,
  WorkStatuses.enum.Superseded,
];

const OUT_OF_PRINT_STATUSES: WorkStatus[] = [WorkStatuses.enum.Withdrawn, WorkStatuses.enum.Superseded];

type DateRoleContract = {
  /** How the role is named in a diagnostic. */
  label: string;
  /** Statuses whose work the backend refuses when this date is missing. */
  requiredFor: WorkStatus[];
  /** Statuses whose work the backend refuses when this date is *present*, if any. */
  storableFor?: WorkStatus[];
};

/** The two PublishingDate roles Thoth has a field for, and what the backend does with each. */
const DATE_ROLES: Record<string, DateRoleContract> = {
  [PublishingDateRole._01]: { label: 'Publication date', requiredFor: PUBLISHED_STATUSES },
  [PublishingDateRole._13]: {
    label: 'Withdrawn date',
    requiredFor: OUT_OF_PRINT_STATUSES,
    storableFor: OUT_OF_PRINT_STATUSES,
  },
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
  private readonly lookupCoordinator: ImportLookupCoordinator;

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
    this.lookupCoordinator = new ImportLookupCoordinator(contributorService, institutionService);
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
    } catch (error) {
      console.error('Unexpected error while processing ONIX bulk import', error);

      return {
        status: 'failed',
        data: this.emptyData(),
        issues: [
          {
            severity: 'error',
            code: 'onix.processing_failed',
            message: ONIX_PROCESSING_FAILURE_MESSAGE,
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

    const status = this.parseWorkStatus(product);

    const { imageCount, tableCount, audioCount, videoCount } = this.parseMedia(product);
    const { publicationDate, withdrawnDate } = this.parseDates(product, index, status);
    const languages = this.parseLanguages(product, index);
    const textLocale = this.parseTextLocale(product);
    const fundings = await this.parseFundings(product);
    const workContributors = product.DescriptiveDetail?.Contributor ?? [];
    const workContributions = await this.parseContributors(workContributors, workId, product, index);

    const work = getDefaultWork({
      id: workId,
      status,
      type: workType,
      imprintId,
      doi: this.parseDoi(product, index),
      lccn: this.parseLccn(product),
      oclc: this.parseOclc(product),
      license: this.parseLicense(product, index),
      copyrightHolder: this.parseCopyrightHolder(product),
      titles: this.parseTitle(product, textLocale),
      edition: this.parseEdition(product),
      bibliographyNote: this.parseBibliographyNote(product),
      generalNote: this.parseGeneralNote(product),
      abstracts: this.parseAbstracts(product, index, textLocale),
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

    const chapters = await this.parseChapters(product, index, work, textLocale);

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

  /** Says what a DOI a product supplied could not become, without failing the work over it. */
  private warnAboutDoi(product: ExtendedProduct, index: number, detail: string) {
    this.issues.push({
      severity: 'warning',
      code: 'onix.identifier.unusable_doi',
      message: detail,
      source: this.productSource(product, index),
    });
  }

  /**
   * Turns a DOI selection into the value to store, reporting whatever could not be used.
   *
   * A DOI is optional metadata everywhere Thoth stores one, so nothing here blocks an import:
   * the work or chapter is created without a DOI and the user is told which value was refused.
   * `subject` names what the DOI was for, so one routine serves both the product and its chapters.
   */
  private resolveDoi(
    selection: OnixDoiSelection,
    product: ExtendedProduct,
    index: number,
    subject: string,
    omission: string,
  ): string {
    selection.unusable.forEach((value) =>
      this.warnAboutDoi(
        product,
        index,
        `"${value}" is given as a DOI for ${subject}, which Thoth cannot represent as one, so it was not imported`,
      ),
    );

    if (selection.kind === 'conflict') {
      this.warnAboutDoi(
        product,
        index,
        `More than one distinct DOI (${selection.dois.join(', ')}) is given for ${subject}, so ${omission}`,
      );

      return '';
    }

    return selection.kind === 'doi' ? selection.doi : '';
  }

  /**
   * The work's DOI, in the single form Thoth stores.
   *
   * ProductIdentifier is repeatable, so the type has to be read off every occurrence rather than
   * off whichever one came first — an ISBN listed before the DOI used to be enough to hide it —
   * and only ProductIDType 06 is a DOI. What the sender wrote is then canonicalised rather than
   * prefixed: `doiPrefix + value` turned an already-resolver-prefixed DOI into
   * `https://doi.org/https://doi.org/10.…` and a publisher's product code into a URL that looks
   * like a DOI until the API parses it.
   */
  private parseDoi(product: ExtendedProduct, index: number) {
    const identifiers = this.convertToArray(product.ProductIdentifier).filter((identifier) => !!identifier);

    const selection = selectCanonicalDoi(
      identifiers
        .filter((identifier) => getOnixText(identifier.ProductIDType) === ProductIdentifierType._06)
        .map((identifier) => getOnixText(identifier.IDValue)),
    );

    return this.resolveDoi(
      selection,
      product,
      index,
      this.describeProduct(product, index),
      'it was imported without a work DOI',
    );
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
   * The markup input format one piece of ONIX text should be created with, resolved here — while
   * the `textformat` declaration is still in hand — because the services that build the mutation
   * only ever see the extracted string. The policy itself lives in {@link resolveOnixTextMarkup}.
   *
   * `undefined` means no format could safely be determined. That pushes a blocking issue — the
   * import will not run — and the caller must drop the text rather than hand it on, so nothing
   * lacking a resolved format can ever reach a mutation, however this plan is later used.
   */
  private resolveTextMarkup(
    text: OnixText | undefined,
    content: string,
    product: ExtendedProduct,
    index: number,
    subject: string,
  ): ImportedMarkupFormat | undefined {
    const declared = getOnixTextFormat(text);
    const resolution = resolveOnixTextMarkup(declared, content);

    if (resolution.kind === 'format') return resolution.format;

    const declaration = declared.length > 0 ? `declares ONIX textformat "${declared}"` : 'declares no ONIX textformat';
    const tags = resolution.tags.map((tag) => `<${tag}>`).join(', ');

    this.issues.push({
      severity: 'error',
      code: 'onix.text.unrepresentable_format',
      message: `The ${subject} of ${this.describeProduct(product, index)} ${declaration} but contains markup Thoth cannot safely read as HTML, JATS or plain text (${tags}), so it cannot be imported`,
      source: this.productSource(product, index),
    });

    return undefined;
  }

  /**
   * The work's abstracts, each in the language its own TextContent claims.
   *
   * The two abstracts are read from separate TextContent composites, so each resolves its locale
   * from its own Text element. Neither inherits the other's: a file that supplies an English
   * short description alongside a French description is describing two languages, not one.
   *
   * Each abstract also resolves its markup input format from its own Text element, for the same
   * reason: a plain short description beside an HTML long description is two formats, not one.
   */
  private parseAbstracts(
    product: ExtendedProduct,
    index: number,
    textLocale: LocaleCodeType | undefined,
  ): AbstractEntity[] {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const longText = collateralDetailTextContent.find((text) => text?.TextType === TextType._03)?.Text;
    const shortText = collateralDetailTextContent.find((text) => text?.TextType === TextType._02)?.Text;
    const longAbstract = getOnixText(longText);
    const shortAbstract = getOnixText(shortText);
    const abstracts: AbstractEntity[] = [];

    if (longAbstract.length > 0) {
      const sourceMarkupFormat = this.resolveTextMarkup(longText, longAbstract, product, index, 'long abstract');

      if (sourceMarkupFormat !== undefined) {
        abstracts.push(
          getDefaultAbstract({
            content: longAbstract,
            type: AbstractTypes.enum.Long,
            canonical: true,
            localeCode: this.resolveLocale(getOnixLanguage(longText), textLocale),
            sourceMarkupFormat,
          }),
        );
      }
    }

    if (shortAbstract.length > 0) {
      const sourceMarkupFormat = this.resolveTextMarkup(shortText, shortAbstract, product, index, 'short abstract');

      if (sourceMarkupFormat !== undefined) {
        abstracts.push(
          getDefaultAbstract({
            content: shortAbstract,
            type: AbstractTypes.enum.Short,
            canonical: false,
            localeCode: this.resolveLocale(getOnixLanguage(shortText), textLocale),
            sourceMarkupFormat,
          }),
        );
      }
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

  /**
   * The work's publication and withdrawn dates, as calendar days or not at all.
   *
   * ONIX dates carry their own precision, Thoth's do not: `publication_date` and `withdrawn_date`
   * are a PostgreSQL `date` behind chrono's `NaiveDate`, which names a day and nothing less. So a
   * complete ONIX day converts exactly — that is the Thoth round trip, `dateformat="00"` — and
   * anything coarser or malformed is refused rather than completed. Handing `2024` on unconverted
   * was enough for the mapper's `dayjs` to make it 1 January, and `20240230` to make it 1 March.
   *
   * Each role is resolved on its own first, because what a role says is a fact about that role
   * alone; only then are the two answers checked against each other and against the work's status,
   * which is where the rest of `WorkProperties::validate` lives.
   */
  private parseDates(product: ExtendedProduct, index: number, status: WorkStatus) {
    const dates = this.convertToArray(product.PublishingDetail?.PublishingDate).filter((date) => !!date);

    const publicationDate = this.resolveDate(
      selectPublishingDate(dates, PublishingDateRole._01),
      product,
      index,
      status,
      PublishingDateRole._01,
    );

    const withdrawnDate = this.resolveDate(
      selectPublishingDate(dates, PublishingDateRole._13),
      product,
      index,
      status,
      PublishingDateRole._13,
    );

    return this.reconcileDates(publicationDate, withdrawnDate, product, index, status);
  }

  /**
   * Holds the two resolved dates to the rules that involve both of them, or the work's status.
   *
   * A date can be a perfectly good calendar day and still be one Thoth cannot store *here*.
   * `WorkProperties::validate` stores a withdrawn date for the out-of-print statuses and refuses
   * one for every other status, so an active work that supplies a withdrawal date is a work whose
   * `createWork` would fail — the date is representable, the combination is not. That is a loss of
   * source metadata like any other, so the date is dropped and reported, and the work imports.
   *
   * A withdrawal that precedes publication is different in kind. Both fields are compulsory for
   * the statuses that can reach this check, so there is nothing to drop that would leave a valid
   * mutation: keeping either date alone still fails, and reordering or choosing between them would
   * be inventing a history the file did not state. It blocks.
   */
  private reconcileDates(
    publicationDate: string,
    withdrawnDate: string,
    product: ExtendedProduct,
    index: number,
    status: WorkStatus,
  ) {
    const productDescription = this.describeProduct(product, index);
    const { storableFor } = DATE_ROLES[PublishingDateRole._13];

    // Runs on the resolved value, so a withdrawn date that was already dropped as unrepresentable
    // cannot collect a second complaint about the status it was never going to reach.
    if (withdrawnDate.length > 0 && storableFor && !storableFor.includes(status)) {
      this.issues.push({
        severity: 'warning',
        code: 'onix.date.incompatible_status',
        message: `Withdrawn date "${withdrawnDate}" in ${productDescription} cannot be stored for a work with status ${status}, so it was not imported`,
        source: this.productSource(product, index),
      });

      return { publicationDate, withdrawnDate: '' };
    }

    if (
      publicationDate.length > 0 &&
      withdrawnDate.length > 0 &&
      isEarlierCalendarDate(withdrawnDate, publicationDate)
    ) {
      this.pushError(
        product,
        index,
        `Withdrawn date ${withdrawnDate} is earlier than publication date ${publicationDate} in ${productDescription}, which Thoth does not accept`,
      );
    }

    return { publicationDate, withdrawnDate };
  }

  /**
   * Turns one role's date selection into the value to store, reporting what could not be used.
   *
   * Severity comes from the backend rather than from intuition. A work whose status makes the
   * date compulsory cannot be created without it — see {@link DATE_ROLES} — so refusing the file
   * here says so while the whole upload can still be fixed, rather than letting a guaranteed
   * failure surface halfway through creating works. A work that is valid without the date is
   * imported without it and the user is told.
   *
   * Two usable dates for one role are always an error, whatever the status: the sender has stated
   * two contradictory facts, and choosing the earlier, the later or the first would all be
   * inventions.
   */
  private resolveDate(
    selection: OnixDateSelection,
    product: ExtendedProduct,
    index: number,
    status: WorkStatus,
    role: keyof typeof DATE_ROLES,
  ): string {
    const { label, requiredFor } = DATE_ROLES[role];
    const productDescription = this.describeProduct(product, index);

    if (selection.kind === 'conflict') {
      this.pushError(
        product,
        index,
        `More than one ${label.toLowerCase()} (${selection.dates.join(', ')}) is given for ${productDescription}, so none can be imported`,
      );

      return '';
    }

    const date = selection.kind === 'date' ? selection.date : '';

    selection.unrepresentable.forEach((value) => {
      const message = `${label} "${value}" in ${productDescription} is not a complete calendar date Thoth can store`;

      if (date.length === 0 && requiredFor.includes(status)) {
        this.pushError(product, index, `${message}, and a work with status ${status} must have one`);

        return;
      }

      this.issues.push({
        severity: 'warning',
        code: 'onix.date.unrepresentable',
        message: `${message}, so it was not imported`,
        source: this.productSource(product, index),
      });
    });

    return date;
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

    ONIX_SUBJECT_RULES.forEach(({ scheme, type, valueFrom }) => {
      xmlSubjects
        .filter((subject) => getOnixText(subject.SubjectSchemeIdentifier) === scheme)
        .forEach((subject) => {
          const code = getOnixText(valueFrom === 'code' ? subject.SubjectCode : subject.SubjectHeadingText);

          subjects.push({
            id: this.defaultId,
            code,
            type,
            ordinal: subjects.length + 1,
          });
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

    const institutions = await Promise.all(
      institutionsRors.map((ror) => this.lookupCoordinator.findInstitutionByRor(ror)),
    );

    publishersWithFundings.forEach((publisherWithFunding, publisherIndex) => {
      const institution = institutions[publisherIndex];

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

    if (sequenceSelection.kind === 'unrepresentable') {
      // Letting this fall through as "no sequence supplied" would have the planner number the
      // work itself, so a publisher who said "issue 3000000000" would silently get issue 1. The
      // number is real and unambiguous; it is Thoth's column that has no room for it.
      this.pushError(
        product,
        index,
        `Series "${seriesName}" is given publication-order number ${sequenceSelection.values.join(', ')} by ${productDescription}, which is outside the range of issue numbers Thoth can store (1 to ${MAX_ISSUE_ORDINAL})`,
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
   *
   * Selection goes through the same canonicalising helper as every other DOI here, so a cited
   * product that gives its DOI both bare and resolver-prefixed is understood to have given one
   * DOI twice rather than two that contradict each other.
   */
  private resolveReferenceDoi(identifiers: OnixRelatedIdentifier[], product: ExtendedProduct, index: number): string {
    const selection = selectCanonicalDoi(
      identifiers
        .filter((identifier) => getOnixText(identifier.ProductIDType) === ProductIdentifierType._06)
        .map((identifier) => getOnixText(identifier.IDValue)),
    );

    selection.unusable.forEach((value) =>
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies "${value}" as a DOI, which Thoth cannot read as one, so the reference was imported without it`,
      ),
    );

    if (selection.kind === 'conflict') {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies more than one DOI (${selection.dois.join(', ')}), so the reference was imported without one`,
      );

      return '';
    }

    return selection.kind === 'doi' ? selection.doi : '';
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

  /**
   * A contributor's biographies, each in the language its own note claims.
   *
   * ONIX repeats BiographicalNote rather than the Contributor when a biography exists in several
   * languages, and tags each occurrence with a `language` attribute; a note carrying any attribute
   * arrives as an object, so reading it as a plain value made an attributed note `[object Object]`.
   *
   * The language is the note's own or nothing. A biography is independent prose about a person —
   * an English note about a French author is perfectly ordinary — so unlike a title or an
   * abstract it must not inherit the language of the book's text. Where the note does not say, or
   * says something Thoth has no locale for, it keeps the English every ONIX import used to get.
   *
   * The markup input format is likewise each note's own: BiographicalNote repeats, every
   * occurrence carries its own `textformat`, and an English HTML note beside a plain French one
   * is two formats, not one to be inherited from whichever note came first.
   */
  private parseBiographies(contributor: ExtendedContributor, product: ExtendedProduct, index: number) {
    return (
      this.convertToArray(contributor.BiographicalNote)
        .map((note) => ({
          note,
          content: getOnixText(note),
          language: getOnixLanguage(note),
        }))
        .filter(({ content }) => content.length > 0)
        .map(({ note, content, language }) => ({
          content,
          language,
          sourceMarkupFormat: this.resolveTextMarkup(
            note,
            content,
            product,
            index,
            `biography of ${contributor.PersonName ?? 'a contributor'}`,
          ),
        }))
        // A note with no resolvable format has already raised a blocking issue; dropping it here
        // is what guarantees it cannot reach CREATE_BIOGRAPHY whatever happens to the plan.
        .filter(({ sourceMarkupFormat }) => sourceMarkupFormat !== undefined)
        .map(({ content, language, sourceMarkupFormat }, order) => ({
          id: this.defaultId,
          // Thoth marks one biography per contribution as the canonical one, and ONIX says nothing
          // about which of several languages is primary, so the first one listed keeps the role.
          canonical: order === 0,
          content,
          localeCode: localeFromLanguageCode(language) ?? LocaleCode.En,
          contributionId: this.defaultId,
          sourceMarkupFormat,
        }))
    );
  }

  private async parseContributors(
    contributors: ExtendedContributor[] | ExtendedContributor,
    workId: WorkId,
    product: ExtendedProduct,
    index: number,
  ) {
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
      const biographies = this.parseBiographies(contributor, product, index);

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
      };

      if (newContributor.fullName.length === 0) continue;

      const [foundedInstitution, foundedContributors] = await Promise.all([
        this.lookupCoordinator.findInstitutionByRor(affiliationInstitutionRor),
        this.lookupCoordinator.findContributors(newContributor.fullName),
      ]);

      const affiliation = foundedInstitution
        ? getDefaultAffiliation({
            institutionId: foundedInstitution.id,
            institutionName: foundedInstitution.name,
            rorId: foundedInstitution.ror,
            position: affiliationPosition,
          })
        : null;

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

  /**
   * The DOI of one ContentItem, in the single form Thoth stores.
   *
   * TextItemIdentifier is repeatable and carries a TextItemIDType (ONIX List 43), of which only
   * `06` is a DOI — the code Thoth's own exporter writes for a chapter DOI. Reading `IDValue` off
   * the first identifier without looking at its type made a proprietary chapter key into a DOI,
   * and prefixing a resolver onto it made that key look like one.
   */
  private parseChapterDoi(chapter: ExtendedCollection, product: ExtendedProduct, index: number): string {
    const identifiers = this.convertToArray(chapter?.TextItem?.TextItemIdentifier).filter((identifier) => !!identifier);

    const selection = selectCanonicalDoi(
      identifiers
        .filter((identifier) => getOnixText(identifier.TextItemIDType) === TextItemIdentifierType._06)
        .map((identifier) => getOnixText(identifier.IDValue)),
    );

    return this.resolveDoi(
      selection,
      product,
      index,
      `a chapter of ${this.describeProduct(product, index)}`,
      'the chapter was imported without one',
    );
  }

  private async parseChapters(
    product: ExtendedProduct,
    index: number,
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
      const { title: chapterTitleContent, language: chapterLanguage } = extractOnixTitle(
        chapter?.TitleDetail,
        TitleElementLevel._04,
      );

      const newChapter = getDefaultChapter({
        id: chapterId,
        status,
        doi: this.parseChapterDoi(chapter, product, index),
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

      const workContributions = await this.parseContributors(chapterContributors, newChapter.id, product, index);

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
