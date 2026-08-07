import {
  LanguageRole,
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  PublishingDateRole,
  TextType,
  TitleElementLevel,
  WebsiteRole,
  WorkIdentifierType,
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
import { SeriesType } from '../../constants/series';
import { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ContributorsForSelection,
  SeriesImportPlan,
  SeriesImportTarget,
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
} from '../../utils';
import { ExtendedContributor, ExtendedONIXMessageRoot, ExtendedProduct } from './interfaces';
import {
  classifyCollectionType,
  type CollectionSupport,
  extractOnixTitle,
  getCollectionIssn,
  getOnixText,
  normalizeSeriesName,
  selectSeriesCollection,
  toOnixArray,
} from './onix';

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

/**
 * One product's resolved ONIX Collection, before grouping. Holds everything the plan builder
 * needs to deduplicate, detect conflicts and report errors with product context, and
 * deliberately no series id of its own: `existingSeriesId` is set only when a real Thoth
 * series was matched.
 */
type SeriesCandidate = {
  /** Imprint-scoped grouping key. Local to parsing; never reaches the API or the plan. */
  identity: string;
  name: string;
  imprintId: string;
  issn: string;
  support: CollectionSupport;
  existingSeriesId?: string;
  productIndex: number;
  productDescription: string;
  /** Set only when ONIX supplied a usable CollectionSequenceNumber. */
  ordinal?: number;
};

/** What {@link XMLParser.parseWork} produces for one ONIX product. */
type ParsedProduct = {
  work: WorkEntity;
  chapters: WorkEntity[];
  seriesCandidate?: SeriesCandidate;
};

/** ONIX writes ISSNs unhyphenated, Thoth stores them hyphenated. Compare on digits alone. */
const isSameIssn = (a: string, b: string) =>
  a.replace(/-/g, '').toUpperCase() === b.replace(/-/g, '').toUpperCase() && b.length > 0;

/** Names the products involved in a series-level conflict, capped so errors stay readable. */
const describeProducts = (candidates: { productDescription: string }[]) => {
  const descriptions = [...new Set(candidates.map(({ productDescription }) => productDescription))];

  return descriptions.length > 3
    ? `${descriptions.slice(0, 3).join(', ')} and ${descriptions.length - 3} more`
    : descriptions.join(' and ');
};

class XMLParser {
  private xml: ExtendedONIXMessageRoot;
  /**
   * Errors are tagged with the product they came from because products are parsed
   * concurrently: without the tag the order shown in the UI would depend on which product
   * happened to finish first.
   */
  private errors: { index: number; message: string }[] = [];
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

  async parse() {
    try {
      const products = this.convertToArray(this.xml.ONIXMessage.Product).filter((product) => !!product);

      if (products.length === 0) {
        return {
          status: 'failed',
          data: { works: [], series: [], chapters: [], contributorsForSelection: {} },
          errors: ['No products found in XML file'],
        };
      }

      const promises = products.map((product, index) => this.parseWork(product, index + 1, WorkTypes.enum.EditedBook));

      // `Promise.all` resolves in input order regardless of completion order, so collecting
      // the results here — rather than letting each concurrent `parseWork` push into shared
      // state — keeps works, chapters and series ordinals in ONIX product order.
      const parsedProducts = await Promise.all(promises);

      this.parsedWorks = parsedProducts.map(({ work }) => work);
      this.parsedChapters = parsedProducts.flatMap(({ chapters }) => chapters);
      this.parsedSeries = this.buildSeriesPlan(parsedProducts);

      if (this.errors.length > 0) {
        return {
          status: 'failed',
          data: { works: [], series: [], chapters: [], contributorsForSelection: {} },
          errors: this.sortedErrors(),
        };
      }

      return {
        status: 'success',
        data: {
          works: this.parsedWorks,
          series: this.parsedSeries,
          chapters: this.parsedChapters,
          contributorsForSelection: this.contributorsForSelection,
        },
        errors: [],
      };
    } catch (_error) {
      return {
        status: 'failed',
        data: { works: [], series: [], chapters: [], contributorsForSelection: {} },
        errors: [ERRORS.XML_PARSING_ERROR],
      };
    }
  }

  private convertToArray<T>(data: T | T[]): T[] {
    return toOnixArray(data);
  }

  private pushError(index: number, message: string) {
    this.errors.push({ index, message });
  }

  /** Errors in ONIX product order, then in the order they were raised within a product. */
  private sortedErrors(): string[] {
    return this.errors
      .map((error, order) => ({ ...error, order }))
      .sort((a, b) => a.index - b.index || a.order - b.order)
      .map(({ message }) => message);
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
      titles: this.parseTitle(product),
      edition: this.parseEdition(product),
      bibliographyNote: this.parseBibliographyNote(product),
      generalNote: this.parseGeneralNote(product),
      abstracts: this.parseAbstracts(product),
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
      references: this.parseReferences(product),
      contributions: workContributions,
    });

    const chapters = await this.parseChapters(product, work);

    return { work, chapters, seriesCandidate: this.parseSeries(product, index, imprintId) };
  }

  private parseImprint(product: ExtendedProduct, index: number) {
    const xmlImprint = product.PublishingDetail?.Imprint?.ImprintName ?? '';
    const imprint = this.imprints.find((imprint) => imprint.label === xmlImprint);

    if (!imprint) {
      this.pushError(index, `Imprint ${xmlImprint} not found for product ${index}`);
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

  private parseTitle(product: ExtendedProduct): TitleEntity[] {
    const { title, subtitle, fullTitle } = extractOnixTitle(
      product.DescriptiveDetail?.TitleDetail,
      TitleElementLevel._01,
    );

    return [getDefaultTitle({ canonical: true, title, subtitle, fullTitle, localeCode: LanguageTypeAlt.enum.En })];
  }

  private parseEdition(product: ExtendedProduct): number {
    const edition = parseInt(product.DescriptiveDetail?.Edition?.EditionNumber ?? '1');

    return edition;
  }

  private parseAbstracts(product: ExtendedProduct): AbstractEntity[] {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const longAbstract = getOnixText(collateralDetailTextContent.find((text) => text?.TextType === TextType._03)?.Text);
    const shortAbstract = getOnixText(
      collateralDetailTextContent.find((text) => text?.TextType === TextType._02)?.Text,
    );
    const abstracts: AbstractEntity[] = [];

    if (longAbstract.length > 0) {
      abstracts.push(
        getDefaultAbstract({
          content: longAbstract,
          type: AbstractTypes.enum.Long,
          canonical: true,
          localeCode: LanguageTypeAlt.enum.En,
        }),
      );
    }

    if (shortAbstract.length > 0) {
      abstracts.push(
        getDefaultAbstract({
          content: shortAbstract,
          type: AbstractTypes.enum.Short,
          canonical: false,
          localeCode: LanguageTypeAlt.enum.En,
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
      this.pushError(index, `License ${enteredLicense} not found for product ${index}`);
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
      this.pushError(index, `Language not provided for ${productDescription}`);

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
        this.pushError(index, `Language ${enteredLanguageCode} not found for ${productDescription}`);
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
      this.pushError(index, `No supported language role found for ${productDescription}`);
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
   * This is pure: it decides whether the collection names an existing Thoth series or one the
   * import will have to create, but it writes nothing. Grouping, conflict detection and
   * ordinal assignment all happen later in {@link buildSeriesPlan}, once every product has
   * been parsed, so none of it depends on which product finished first.
   *
   * Thoth's bulk import supports a single series membership per work, so exactly one
   * Collection is selected — see {@link selectSeriesCollection} for the rule.
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
      this.pushError(index, `Collection has no usable series title for ${productDescription}`);

      return undefined;
    }

    // Without a resolved imprint we can neither scope the identity nor create a series. The
    // unresolved imprint is already reported by parseImprint, so stay quiet here.
    if (imprintId.length === 0) return undefined;

    const issn = getCollectionIssn(seriesCollection);
    const existingSeries = this.findExistingSeries(seriesName, imprintId, issn);
    const collectionSequence = this.convertToArray(seriesCollection.CollectionSequence).filter(
      (sequence) => !!sequence,
    )[0];
    const sequenceNumber = this.parseNumber(getOnixText(collectionSequence?.CollectionSequenceNumber));

    return {
      // Identity is scoped by imprint: two imprints may each run a series of the same name,
      // and they are not the same series.
      identity: `${imprintId}::${normalizeSeriesName(seriesName)}`,
      name: seriesName,
      imprintId,
      issn,
      support: classifyCollectionType(seriesCollection.CollectionType),
      existingSeriesId: existingSeries?.id,
      productIndex: index,
      productDescription,
      // A sequence of 0 means ONIX supplied nothing usable; Thoth issue ordinals start at 1.
      ordinal: sequenceNumber > 0 ? sequenceNumber : undefined,
    };
  }

  /**
   * Finds the Thoth series an ONIX collection refers to, within the work's own imprint.
   *
   * Matching is conservative and tried in a fixed order, so the result never depends on the
   * order Thoth happened to return series in:
   *
   * 1. exact name;
   * 2. normalised name (trimmed, whitespace collapsed, case folded);
   * 3. ISSN, against either of Thoth's print and digital ISSN fields.
   *
   * ISSN is tried last because it is the rarest signal, but it is the strongest one: it
   * survives a series being renamed.
   */
  private findExistingSeries(seriesName: string, imprintId: string, issn: string) {
    const candidates = this.serieses.filter((series) => series.imprintId === imprintId);
    const normalizedName = normalizeSeriesName(seriesName);

    return (
      candidates.find((series) => series.name === seriesName) ??
      candidates.find((series) => normalizeSeriesName(series.name) === normalizedName) ??
      (issn.length > 0
        ? candidates.find((series) => [series.issnPrint, series.issnDigital].some((value) => isSameIssn(value, issn)))
        : undefined)
    );
  }

  /**
   * Groups series candidates into the deduplicated plan the bulk import consumes, and assigns
   * every work its issue ordinal.
   *
   * Runs once, after `Promise.all`, over results held in ONIX product order, so both the
   * grouping and the ordinals are independent of parsing completion order.
   *
   * Ordinals behave identically for existing and newly proposed series; a proposed series
   * simply has no existing issues, so its numbering starts at 1.
   *
   * - A CollectionSequenceNumber supplied by the publisher is preserved verbatim.
   * - Everything else is appended after the highest ordinal already known for the series,
   *   counting both its existing Thoth issues and every explicit ordinal in this import, so a
   *   sequence number appearing later in the file cannot collide with an ordinal already
   *   handed out. Unnumbered works are numbered upwards in ONIX product order.
   */
  private buildSeriesPlan(parsedProducts: ParsedProduct[]): SeriesImportPlan {
    const groups = new Map<string, { work: WorkEntity; candidate: SeriesCandidate }[]>();

    for (const { work, seriesCandidate } of parsedProducts) {
      if (!seriesCandidate) continue;

      const members = groups.get(seriesCandidate.identity) ?? [];

      members.push({ work, candidate: seriesCandidate });
      groups.set(seriesCandidate.identity, members);
    }

    const plan: SeriesImportPlan = [];

    for (const members of groups.values()) {
      const candidates = members.map(({ candidate }) => candidate);
      const target = this.resolveSeriesTarget(candidates);

      if (!target) continue;

      const existingOrdinals =
        target.kind === 'existing'
          ? (this.serieses.find((series) => series.id === target.seriesId)?.issues.map(({ ordinal }) => ordinal) ?? [])
          : [];
      const explicitOrdinals = candidates.map(({ ordinal }) => ordinal).filter((ordinal) => ordinal !== undefined);

      let next = Math.max(0, ...existingOrdinals, ...explicitOrdinals) + 1;

      plan.push({
        name: candidates[0].name,
        target,
        works: members.map(({ work, candidate }) => ({ ...work, orderNumber: candidate.ordinal ?? next++ })),
      });
    }

    return plan;
  }

  /**
   * Decides whether a group of candidates points at an existing series or proposes a new one,
   * reporting genuine ambiguity rather than picking whichever product happened to parse first.
   */
  private resolveSeriesTarget(candidates: SeriesCandidate[]): SeriesImportTarget | undefined {
    const first = candidates[0];
    const matchedIds = [...new Set(candidates.map(({ existingSeriesId }) => existingSeriesId).filter((id) => !!id))];

    if (matchedIds.length > 1) {
      this.pushError(
        first.productIndex,
        `Series "${first.name}" matches more than one existing Thoth series for ${describeProducts(candidates)}`,
      );

      return undefined;
    }

    const issns = [...new Set(candidates.map(({ issn }) => issn).filter((issn) => issn.length > 0))];

    // Products naming the same series but declaring different ISSNs describe something we
    // cannot reconcile: either an ISSN is wrong, or these are not one series.
    if (issns.length > 1) {
      this.pushError(
        first.productIndex,
        `Series "${first.name}" is declared with conflicting ISSNs (${issns.join(', ')}) for ${describeProducts(candidates)}`,
      );

      return undefined;
    }

    const [matchedId] = matchedIds;

    if (matchedId) return { kind: 'existing', seriesId: matchedId };

    // Only a publisher collection is a safe basis for creating a Thoth series. An unspecified
    // or editorial-line collection may well be one, so it is still matched above, but we will
    // not invent a series from it.
    const unsupported = candidates.find(({ support }) => support !== 'supported');

    if (unsupported) {
      this.pushError(
        unsupported.productIndex,
        `Series "${unsupported.name}" does not exist in Thoth and cannot be created automatically because its ONIX CollectionType is not a publisher collection (10), for ${unsupported.productDescription}`,
      );

      return undefined;
    }

    return {
      kind: 'proposed',
      series: {
        name: first.name,
        imprintId: first.imprintId,
        type: SeriesType.enum.BookSeries,
        // ONIX supplies an unqualified ISSN with no print/digital distinction, so neither Thoth
        // field can be filled without inventing the answer. The remaining Thoth fields have no
        // ONIX equivalent on a Collection at all. Left empty rather than fabricated.
        issnPrint: '',
        issnDigital: '',
        url: '',
        cfpUrl: '',
        description: '',
      },
    };
  }

  private parseReferences(product: ExtendedProduct) {
    const references: ReferenceEntity[] = [];
    const relatedMaterials = product.RelatedMaterial;
    const relatedWorks = this.convertToArray(relatedMaterials?.RelatedWork).filter((relatedWork) => !!relatedWork);
    const relatedProducts = this.convertToArray(relatedMaterials?.RelatedProduct).filter(
      (relatedProduct) => !!relatedProduct,
    );

    relatedWorks.forEach((relatedWork) => {
      const doi =
        relatedWork.WorkIdentifier?.WorkIDType === WorkIdentifierType._06 && relatedWork.WorkIdentifier?.IDValue
          ? relatedWork.WorkIdentifier.IDValue
          : '';

      references.push({
        id: this.defaultId,
        doi,
        journalTitle: '',
        articleTitle: '',
        seriesTitle: '',
        volumeTitle: '',
        url: '',
        orderNumber: references.length + 1,
        unstructuredCitation: '',
      });
    });

    relatedProducts.forEach((relatedProduct) => {
      const doi =
        relatedProduct.ProductIdentifier?.ProductIDType === ProductIdentifierType._06 &&
        relatedProduct.ProductIdentifier?.IDValue
          ? relatedProduct.ProductIdentifier.IDValue
          : '';
      const citation =
        relatedProduct.ProductIdentifier?.ProductIDType === ProductIdentifierType._01 &&
        relatedProduct.ProductIdentifier?.IDValue
          ? relatedProduct.ProductIdentifier.IDValue
          : '';

      references.push({
        id: this.defaultId,
        doi: doi.startsWith(this.doiPrefix) ? doi : this.doiPrefix + doi,
        journalTitle: '',
        articleTitle: '',
        seriesTitle: '',
        volumeTitle: '',
        url: '',
        orderNumber: references.length + 1,
        unstructuredCitation: citation,
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

  private async parseChapters(product: ExtendedProduct, relatedWork: WorkEntity) {
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
      const { title: chapterTitleContent } = extractOnixTitle(chapter?.TitleDetail, TitleElementLevel._04);

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
            localeCode: LanguageTypeAlt.enum.En,
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
