import {
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  PublishingDateRole,
  TextType,
  WebsiteRole,
  WorkIdentifierType,
} from '@5stones/onix/dist/enums';
import { ONIXMessageRoot, Product } from '@5stones/onix/dist/interfaces';
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
import {
  AbstractEntity,
  appConfig,
  ContributorsForSelection,
  FormFieldOption,
  getContributorRoleFromXml,
  getDefaultAbstract,
  getDefaultAffiliation,
  getDefaultChapter,
  getDefaultContribution,
  getDefaultFunding,
  getDefaultPublication,
  getDefaultTitle,
  getDefaultWork,
  getPublicationType,
  getWorkStatusFromXml,
  isValidPublicationForm,
  LanguageRelation,
  LanguageTypeAlt,
  LocationPlatforms,
  SeriesForUpdateItems,
  SubjectTypes,
  TitleEntity,
  WorkStatuses,
  WorkTypes,
} from '@/src/shared';

import { AbstractTypes } from '../../constants/abstracts';
import { ExtendedContributor, ExtendedProduct } from './interfaces';

class XMLParser {
  private xml: ONIXMessageRoot;
  private errors: string[] = [];
  private parsedWorks: WorkEntity[] = [];
  private parsedSeries: SeriesForUpdateItems = {};
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
    xml: ONIXMessageRoot,
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
      const products: ExtendedProduct[] = this.convertToArray(this.xml.ONIXMessage.Product).filter(
        (product: Product | undefined): product is ExtendedProduct => !!product,
      );

      if (products.length === 0) {
        return {
          status: 'failed',
          data: { works: [], series: {}, chapters: [], contributorsForSelection: {} },
          errors: ['No products found in XML file'],
        };
      }

      const promises = products.map((product, index) => this.parseWork(product, index + 1, WorkTypes.enum.EditedBook));

      await Promise.all(promises);

      if (this.errors.length > 0) {
        return {
          status: 'failed',
          data: { works: [], series: {}, chapters: [], contributorsForSelection: {} },
          errors: this.errors,
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
        data: { works: [], series: {}, chapters: [], contributorsForSelection: {} },
        errors: ['Error parsing XML file'],
      };
    }
  }

  private convertToArray<T>(data: T | T[]): T[] {
    if (!data) return [];

    const result = Array.isArray(data) ? data : [data];

    return result;
  }

  private async parseWork(product: ExtendedProduct, index: number, workType = WorkTypes.enum.EditedBook) {
    const workId = this.generateId();

    const { imageCount, tableCount, audioCount, videoCount } = this.parseMedia(product);
    const { publicationDate, withdrawnDate } = this.parseDates(product);
    const languages = this.parseLanguages(product);
    const fundings = await this.parseFundings(product);
    const workContributors = product.DescriptiveDetail?.Contributor ?? [];
    const workContributions = await this.parseContributors(workContributors, workId);

    const work = getDefaultWork({
      id: workId,
      status: this.parseWorkStatus(product),
      type: workType,
      imprintId: this.parseImprint(product, index),
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
      publications: this.parsePublications(product),
      references: this.parseReferences(product),
      contributions: workContributions,
    });

    await this.parseChapters(product, work);

    this.parsedWorks.push(work);
    this.parseSeries(product, work);
  }

  private parseImprint(product: ExtendedProduct, index: number) {
    const xmlImprint = product.PublishingDetail?.Imprint?.ImprintName ?? '';
    const imprint = this.imprints.find((imprint) => imprint.label === xmlImprint);

    if (!imprint) {
      this.errors.push(`Imprint ${xmlImprint} not found for product ${index}`);
      return '';
    }

    return imprint.value;
  }

  private parseDoi(product: ExtendedProduct) {
    const doi =
      product.ProductIdentifier?.find((identifier) => identifier.ProductIDType === ProductIdentifierType._06)
        ?.IDValue ?? '';

    return doi.length > 0 ? this.doiPrefix + doi : '';
  }

  private parseLccn(product: ExtendedProduct) {
    const lccn =
      product.ProductIdentifier?.find((identifier) => identifier.ProductIDType === ProductIdentifierType._13)
        ?.IDValue ?? '';

    return lccn;
  }

  private parseOclc(product: ExtendedProduct) {
    const oclc =
      product.ProductIdentifier?.find((identifier) => identifier.ProductIDType === ProductIdentifierType._23)
        ?.IDValue ?? '';

    return oclc;
  }

  private parseTitle(product: ExtendedProduct): TitleEntity[] {
    const title = product.DescriptiveDetail?.TitleDetail?.TitleElement?.TitleText ?? '';
    const subtitle = product.DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle ?? '';
    const fullTitle = `${title} ${subtitle}`.trim();

    return [getDefaultTitle({ canonical: true, title, subtitle, fullTitle, localeCode: LanguageTypeAlt.enum.En })];
  }

  private parseEdition(product: ExtendedProduct): number {
    const edition = parseInt(product.DescriptiveDetail?.Edition?.EditionNumber ?? '1');

    return edition;
  }

  private parseAbstracts(product: ExtendedProduct): AbstractEntity[] {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const longAbstract =
      collateralDetailTextContent.find((text) => text?.TextType === TextType._03)?.Text?.['#text'] ?? '';
    const shortAbstract =
      collateralDetailTextContent.find((text) => text?.TextType === TextType._02)?.Text?.['#text'] ?? '';
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
      this.errors.push(`License ${enteredLicense} not found for product ${index}`);
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
    const note = collateralDetailTextContent.find((text) => text?.TextType === TextType._13)?.Text?.['#text'] ?? '';

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

    const publicationDate =
      publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._01)?.Date?.['#text'] ?? '';

    const withdrawnDate =
      publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._13)?.Date?.['#text'] ?? '';

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
    const publishersWithWebsites = publishers.filter(
      (publisher) => publisher?.Website && publisher.Website?.length > 0,
    );

    const websites = publishersWithWebsites.map((publisher) => this.convertToArray(publisher.Website));

    const websiteWithLandingPage = websites
      .flatMap((website) => website)
      .find((website) => website?.WebsiteRole === WebsiteRole._02);

    const landingPage = websiteWithLandingPage?.WebsiteLink ?? '';

    return landingPage;
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

  private parseLanguages(product: ExtendedProduct) {
    const enteredLanguageCode = product.DescriptiveDetail?.Language?.LanguageCode ?? '';
    const language = this.languages.find(
      (option) =>
        option.label.toLowerCase() === enteredLanguageCode.toLowerCase() ||
        option.value.toLowerCase() === enteredLanguageCode.toLowerCase(),
    );
    const workLanguages: LanguageEntity[] = [];

    if (!language) {
      this.errors.push(
        `Language ${enteredLanguageCode} not found, should be one of the following: ${this.languages.map((option) => option.label).join(', ')}`,
      );
    }

    if (language) {
      workLanguages.push({
        code: language.value as LanguageCode,
        relation: LanguageRelation.enum.Original,
        isMain: true,
        id: this.defaultId,
      });
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
        const jurisdiction = identifiers.find((identifier) => identifier?.IDTypeName === 'jurisdiction')?.IDValue ?? '';

        const newFunding = getDefaultFunding({
          program,
          projectName,
          projectShortname,
          grantNumber,
          jurisdiction,
          institutionId: institution.id,
          institutionName: institution.name,
          institutionRor: institution.ror,
        });

        fundings.push(newFunding);
      });
    });

    return fundings;
  }

  private parsePublications(product: ExtendedProduct) {
    const publications: PublicationEntity[] = [];
    const descriptiveDetail = product.DescriptiveDetail;

    if (!descriptiveDetail) return publications;

    const productForm = descriptiveDetail.ProductForm;

    if (!productForm) return publications;

    const isValid = isValidPublicationForm(productForm);

    if (!isValid) return publications;

    const height =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.mm,
      )?.Measurement ?? 0;
    const heightIn =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.in,
      )?.Measurement ?? 0;
    const width =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.mm,
      )?.Measurement ?? 0;
    const widthIn =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.in,
      )?.Measurement ?? 0;
    const depth =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.mm,
      )?.Measurement ?? 0;
    const depthIn =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.in,
      )?.Measurement ?? 0;
    const weight =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.gr,
      )?.Measurement ?? 0;
    const weightOz =
      descriptiveDetail.Measure?.find(
        (measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.oz,
      )?.Measurement ?? 0;
    const isbn =
      product.ProductIdentifier?.find((identifier) => identifier.ProductIDType === ProductIdentifierType._15)
        ?.IDValue ?? '';
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
        this.errors.push(
          `Currency code ${price?.CurrencyCode} not found, should be one of the following: ${this.currencyOptions.map((option) => option.label).join(', ')}`,
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
    const landingPage =
      productSupply.SupplyDetail.Supplier.Website?.find((website) => website.WebsiteRole === '02')?.WebsiteLink ?? '';
    const fullTextUrl =
      productSupply.SupplyDetail.Supplier.Website?.find((website) => website.WebsiteRole === '29')?.WebsiteLink ?? '';
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

  private parseSeries(product: ExtendedProduct, work: WorkEntity) {
    const seriesCollections = this.convertToArray(product.DescriptiveDetail?.Collection).filter(
      (collection) => !!collection,
    );
    const seriesCollection = seriesCollections[0];

    if (!seriesCollection) return;

    const seriesName = seriesCollection?.TitleDetail?.TitleElement?.TitleText ?? '';
    const existingSeries = this.serieses.find((series) => series.name === seriesName);

    if (!existingSeries) {
      this.errors.push(`Series ${seriesName} not found`);

      return;
    }

    const collectionSequence = seriesCollection?.CollectionSequence?.CollectionSequenceNumber ?? 1;
    const orderNumber = this.parseNumber(collectionSequence.toString());

    const existingData = this.parsedSeries[existingSeries.id] ?? [];
    this.parsedSeries[existingSeries.id] = [...existingData, { ...work, orderNumber }];
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

    const newChapters: Record<WorkId, WorkEntity[]> = {
      [workId]: [],
    };

    const sortedChapters = chapterCollections.sort(
      (chapterA, chapterB) => (chapterA.LevelSequenceNumber ?? 0) - (chapterB.LevelSequenceNumber ?? 0),
    );

    for (const chapter of sortedChapters) {
      const chapterId = this.generateId();
      const chapterDoi = chapter?.TextItem?.TextItemIdentifier?.IDValue ?? '';
      const chapterTitleContent = chapter?.TitleDetail?.TitleElement?.TitleText ?? '';

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
        pageCount: this.parseNumber(chapter?.NumberOfPages?.toString() ?? '0'),
        firstPage: chapter?.PageRun?.FirstPageNumber ?? '',
        lastPage: chapter?.PageRun?.LastPageNumber ?? '',
        contributions: [],
      });

      const chapterContributors = chapter?.Contributor ?? [];

      const workContributions = await this.parseContributors(chapterContributors, newChapter.id);

      newChapter.contributions = workContributions;

      newChapters[workId].push(newChapter);
    }

    this.parsedChapters = [...this.parsedChapters, ...newChapters[workId]];
  }

  private generateId() {
    return uuidv4();
  }
}

export default XMLParser;
