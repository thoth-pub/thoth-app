/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  PublishingDateRole,
  TextType,
} from '@5stones/onix/dist/enums';
import { Publisher } from '@5stones/onix/dist/interfaces';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { validateXml } from '@/app/actions/validateXml';
import { LanguageCode, LocaleCode } from '@/gql/graphql';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorService } from '@/src/entities/contributor';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { InstitutionService } from '@/src/entities/institution';
import { InstitutionEntity, InstitutionRor } from '@/src/entities/institution/model/institution.types';
import { CurrencyCode } from '@/src/entities/price/model/price.types';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import {
  appConfig,
  convertOrchidIdToText,
  type FormFieldOption,
  getContributorRoleFromXml,
  getDefaultAffiliation,
  getDefaultChapter,
  getDefaultContribution,
  getDefaultFunding,
  getDefaultPublication,
  getDefaultWork,
  getPublicationType,
  getWorkStatusFromXml,
  isDefaultId,
  isValidPublicationForm,
  LanguageRelation,
  LocationPlatforms,
  SubjectTypes,
  WorkStatuses,
  WorkTypes,
} from '@/src/shared';
import { currencyOptions, languageOptions, licenseOptions } from '@/src/shared/constants/formFields';
import {
  Button,
  LinkTooltip,
  OrchidLogo,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationSuccess?: (data: WorkEntity[]) => void;
  onValidationFailure?: (errors: string[]) => void;
};

type SeriesForUpdateItem = WorkEntity & {
  orderNumber: number;
};

type ContributorSelection = {
  lastContribution: string;
  selected: boolean;
} & WorkContribution;

type MultipleFoundedContributors = Record<WorkId, Record<string, ContributorSelection[]>>;

const defaultId = appConfig.defaultId;
// TODO: Refactor, add short abstract, long abstract parsing
export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure } = props;

  const imprintsLabels = imprints.map((imprint) => imprint.label);

  const contributorService = new ContributorService();
  const institutionService = new InstitutionService();

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [chapters, setChapters] = useState<Record<WorkId, WorkEntity[]>>({});
  const [seriesForUpdate, setSeriesForUpdate] = useState<Record<string, SeriesForUpdateItem[]>>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<MultipleFoundedContributors>({});

  const fetchedInstitutions: Record<InstitutionRor, InstitutionEntity> = {};

  const showContributorsSelection = Object.keys(multipleFoundedContributors).length > 0;

  const isDataEmpty = works.length === 0;

  const validateXMLFile = async (file: File) => {
    const response = await validateXml(file);

    if (response.status === 'error') {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const { data } = response;
    const errors: string[] = [];

    if (!data) {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const { ONIXMessage } = data;

    if (!ONIXMessage || !ONIXMessage.Product) {
      onValidationFailure?.(['Invalid XML file, missing products data']);
      return;
    }

    const uploadedProducts = Array.isArray(ONIXMessage.Product) ? ONIXMessage.Product : [ONIXMessage.Product];

    uploadedProducts.forEach((product, index) => {
      const xmlImprint = product.PublishingDetail?.Imprint?.ImprintName ?? '';
      const imprint = imprints.find((option) => option.label === xmlImprint);

      const productNumber = index + 1;

      console.log('product', product);

      if (!imprint) {
        errors.push(
          `Imprint ${xmlImprint} not found for product ${productNumber}, should be one of the following: ${imprintsLabels.join(', ')}`,
        );
        return;
      }

      const {
        ProductIdentifier = [],
        DescriptiveDetail,
        PublishingDetail,
        ProductSupply,
        CollateralDetail,
        // @ts-expect-error not exist in library types
        ContentDetail,
        RelatedMaterial,
      } = product;

      const workId = uuidv4();

      const collateralDetailTextContent = Array.isArray(CollateralDetail?.TextContent)
        ? CollateralDetail?.TextContent
        : [CollateralDetail?.TextContent];

      const doi =
        ProductIdentifier.find((identifier) => identifier.ProductIDType === ProductIdentifierType._06)?.IDValue ?? '';
      const lccn =
        ProductIdentifier.find((identifier) => identifier.ProductIDType === ProductIdentifierType._13)?.IDValue ?? '';
      const oclc =
        ProductIdentifier.find((identifier) => identifier.ProductIDType === ProductIdentifierType._23)?.IDValue ?? '';

      const enteredLicense =
        // @ts-expect-error not exist in library types
        product.DescriptiveDetail?.EpubLicense?.EpubLicenseExpression?.EpubLicenseExpressionLink ?? '';
      const license = licenseOptions.find((option) => option.value.startsWith(enteredLicense));

      if (!license) {
        errors.push(
          `License for product ${productNumber} invalid, should be one of the following: ${licenseOptions.map((option) => option.label).join(', ')}`,
        );
      }
      // TODO: fix titles
      // const title = DescriptiveDetail?.TitleDetail?.TitleElement?.TitleText ?? '';
      // const subtitle = DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle ?? '';

      // @ts-expect-error not exist in library types
      const edition = DescriptiveDetail?.Edition?.EditionNumber ?? 1;

      // @ts-expect-error not exist in library types
      const bibliographyNote = DescriptiveDetail?.IllustrationsNote?.IllustrationsNoteText ?? '';
      const generalNote =
        collateralDetailTextContent.find((text) => text?.TextType === TextType._13)?.Text?.['#text'] ?? '';

      const pageCount = DescriptiveDetail?.Extent?.ExtentValue ?? 0;
      // @ts-expect-error not exist in library types
      const ancillaryContent = Array.isArray(DescriptiveDetail?.AncillaryContent)
        ? // @ts-expect-error not exist in library types
          DescriptiveDetail?.AncillaryContent
        : // @ts-expect-error not exist in library types
          [DescriptiveDetail?.AncillaryContent];
      const imageCount =
        // @ts-expect-error not exist in library types
        ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '09')?.Number ?? 0;
      const tableCount =
        // @ts-expect-error not exist in library types
        ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '11')?.Number ?? 0;
      const audioCount =
        // @ts-expect-error not exist in library types
        ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '19')?.Number ?? 0;
      const videoCount =
        // @ts-expect-error not exist in library types
        ancillaryContent.find((ancillary) => ancillary.AncillaryContentType === '00')?.Number ?? 0;

      const enteredPublishers = PublishingDetail?.Publisher ?? ([] as Publisher[]);
      const publishers = Array.isArray(enteredPublishers) ? enteredPublishers : [enteredPublishers];

      const workStatus = PublishingDetail?.PublishingStatus
        ? getWorkStatusFromXml(PublishingDetail?.PublishingStatus)
        : WorkStatuses.enum.Forthcoming;

      const publicationDates = Array.isArray(PublishingDetail?.PublishingDate)
        ? PublishingDetail?.PublishingDate
        : [PublishingDetail?.PublishingDate];

      const publicationDate =
        publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._01)?.Date?.['#text'] ?? '';

      const withdrawnDate =
        publicationDates.find((date) => date?.PublishingDateRole === PublishingDateRole._13)?.Date?.['#text'] ?? '';

      // @ts-expect-error not exist in library types
      const copyrightHolder = PublishingDetail?.CopyrightStatement?.CopyrightOwner?.PersonName ?? '';

      const publishersWithWebsites = publishers.filter(
        // @ts-expect-error not exist in library types
        (publisher) => publisher?.Website && publisher.Website?.length > 0,
      );

      const websites = publishersWithWebsites.map((publisher) => {
        // @ts-expect-error not exist in library types
        const array = Array.isArray(publisher.Website) ? publisher.Website : [publisher.Website];

        return array;
      });

      const websiteWithLandingPage = websites
        .flatMap((website) => website)
        .find((website: { WebsiteRole: string }) => website.WebsiteRole === '02');

      const work: WorkEntity = getDefaultWork({
        id: workId,
        status: workStatus,
        type: WorkTypes.enum.EditedBook,
        imprintId: imprint?.value ?? '',
        lccn,
        oclc,
        license: license?.value ?? '',
        copyrightHolder,
        titles: [],
        edition,
        bibliographyNote,
        generalNote,
        publicationDate,
        withdrawnDate,
        landingPage: websiteWithLandingPage?.WebsiteLink ?? '',
        pageCount: Number(pageCount),
        imageCount: Number(imageCount),
        tableCount: Number(tableCount),
        audioCount: Number(audioCount),
        videoCount: Number(videoCount),
        fundings: [],
        references: [],
      });

      // Publication
      if (DescriptiveDetail?.ProductForm && isValidPublicationForm(DescriptiveDetail?.ProductForm)) {
        const height =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.mm,
          )?.Measurement ?? 0;
        const heightIn =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.in,
          )?.Measurement ?? 0;
        const width =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.mm,
          )?.Measurement ?? 0;
        const widthIn =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.in,
          )?.Measurement ?? 0;
        const depth =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.mm,
          )?.Measurement ?? 0;
        const depthIn =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.in,
          )?.Measurement ?? 0;
        const weight =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.gr,
          )?.Measurement ?? 0;
        const weightOz =
          DescriptiveDetail?.Measure?.find(
            (measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.oz,
          )?.Measurement ?? 0;
        const isbn =
          ProductIdentifier.find((identifier) => identifier.ProductIDType === ProductIdentifierType._15)?.IDValue ?? '';

        const publication = getDefaultPublication({
          isbn,
          type: getPublicationType(DescriptiveDetail?.ProductForm),
          width: Number(width),
          widthIn: Number(widthIn),
          height: Number(height),
          heightIn: Number(heightIn),
          depth: Number(depth),
          depthIn: Number(depthIn),
          weight: Number(weight),
          weightOz: Number(weightOz),
          doi: work.doi,
          prices: [],
          locations: [],
        });

        if (ProductSupply && ProductSupply.SupplyDetail && ProductSupply.SupplyDetail.Price) {
          // Prices
          const prices = Array.isArray(ProductSupply.SupplyDetail.Price)
            ? ProductSupply.SupplyDetail.Price
            : [ProductSupply.SupplyDetail.Price];

          prices.forEach((price) => {
            const currencyCode = currencyOptions.find(
              (option) => option.value.toLowerCase() === price.CurrencyCode.toLowerCase(),
            )?.value;

            if (!currencyCode) {
              errors.push(
                `Currency code ${price.CurrencyCode} not found, should be one of the following: ${currencyOptions.map((option) => option.label).join(', ')}`,
              );
              return;
            }

            publication.prices.push({
              id: defaultId,
              currencyCode: currencyCode as CurrencyCode,
              unitPrice: price.PriceAmount ?? 0,
            });
          });

          // Locations
          if (ProductSupply.SupplyDetail.Supplier) {
            const landingPage =
              // @ts-expect-error not exist in library types
              ProductSupply.SupplyDetail.Supplier.Website?.find((website) => website.WebsiteRole === '02')
                ?.WebsiteLink ?? '';
            const fullTextUrl =
              // @ts-expect-error not exist in library types
              ProductSupply.SupplyDetail.Supplier.Website?.find((website) => website.WebsiteRole === '29')
                ?.WebsiteLink ?? '';
            const locationPlatform =
              // @ts-expect-error not exist in library types
              LocationPlatforms.options.find((option) => option === ProductSupply.Market?.Territory?.RegionsIncluded) ??
              LocationPlatforms.enum.Other;

            publication.locations.push({
              id: defaultId,
              canonical: true,
              landingPage,
              fullTextUrl,
              locationPlatform,
            });
          }
        }

        work.publications.push(publication);
      }

      // Subjects
      if (DescriptiveDetail?.Subject) {
        const subjects = Array.isArray(DescriptiveDetail?.Subject)
          ? DescriptiveDetail?.Subject
          : [DescriptiveDetail?.Subject];

        const llcSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === '04');
        const bisacSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === '10');
        const bicSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === '12');
        const keywordSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === '20');
        const themaSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === '93');
        const customSubjects = subjects.filter((subject) => subject.SubjectSchemeIdentifier === 'B2');

        llcSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Lcc,
            ordinal: work.subjects.length + 1,
          });
        });

        bisacSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Bisac,
            ordinal: work.subjects.length + 1,
          });
        });

        bicSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Bic,
            ordinal: work.subjects.length + 1,
          });
        });

        keywordSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Keyword,
            ordinal: work.subjects.length + 1,
          });
        });

        themaSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Thema,
            ordinal: work.subjects.length + 1,
          });
        });

        customSubjects.forEach((subject) => {
          work.subjects.push({
            id: defaultId,
            code: subject.SubjectHeadingText ?? '',
            type: SubjectTypes.enum.Custom,
            ordinal: work.subjects.length + 1,
          });
        });
      }

      // Language
      if (DescriptiveDetail?.Language) {
        const enteredLanguageCode = DescriptiveDetail?.Language?.LanguageCode ?? '';
        const language = languageOptions.find(
          (option) => option.value.toLowerCase() === enteredLanguageCode.toLowerCase(),
        );

        if (!language) {
          errors.push(
            `Language ${enteredLanguageCode} not found, should be one of the following: ${languageOptions.map((option) => option.label).join(', ')}`,
          );
        }

        if (language) {
          work.languages.push({
            code: language.value as LanguageCode,
            relation: LanguageRelation.enum.Original,
            isMain: true,
            id: defaultId,
          });
        }
      }

      // Chapters
      if (ContentDetail) {
        const chapters = Array.isArray(ContentDetail) ? ContentDetail : [ContentDetail];

        const newChapters: Record<WorkId, WorkEntity[]> = {
          [workId]: [],
        };

        chapters
          .sort((a, b) => a.LevelSequenceNumber - b.LevelSequenceNumber)
          .forEach((chapter) => {
            const chapterDoi = chapter?.ContentItem?.TextItem?.TextItemIdentifier?.IDValue ?? '';
            // TODO: fix titles
            // const chapterTitle = chapter?.ContentItem?.TitleDetail?.TitleElement?.TitleText ?? '';

            const newChapter = getDefaultChapter({
              status: workStatus,
              doi: chapterDoi,
              imprintId: imprint?.value ?? '',
              license: license?.value ?? '',
              copyrightHolder,
              titles: [],
              edition,
              publicationDate,
              withdrawnDate,
              pageCount: Number(chapter?.NumberOfPages ?? 0),
              firstPage: chapter?.PageRun?.FirstPageNumber ?? '',
              lastPage: chapter?.PageRun?.LastPageNumber ?? '',
            });

            newChapters[workId].push(newChapter);
          });

        setChapters((prev) => ({
          ...prev,
          [workId]: newChapters[workId],
        }));
      }

      // Relations
      if (RelatedMaterial && RelatedMaterial.RelatedWork) {
        const translations = Array.isArray(RelatedMaterial.RelatedWork)
          ? RelatedMaterial.RelatedWork
          : [RelatedMaterial.RelatedWork];

        translations.forEach((translation) => {
          const doi = translation?.WorkIdentifier === '06' ? translation?.WorkIdentifier?.IDValue : '';

          work.references.push({
            id: defaultId,
            doi,
            journalTitle: '',
            articleTitle: '',
            seriesTitle: '',
            volumeTitle: '',
            url: '',
            orderNumber: work.references.length + 1,
            unstructuredCitation: '',
          });
        });
      }

      if (RelatedMaterial && RelatedMaterial.RelatedProduct) {
        const relatedBooks = Array.isArray(RelatedMaterial.RelatedProduct)
          ? RelatedMaterial.RelatedProduct
          : [RelatedMaterial.RelatedProduct];

        relatedBooks.forEach(async (relatedBook) => {
          const doi = relatedBook?.ProductIdentifier?.IDValue ?? '';

          // TODO: add mapper work relation codes

          work.references.push({
            id: defaultId,
            doi,
            journalTitle: '',
            articleTitle: '',
            seriesTitle: '',
            volumeTitle: '',
            url: '',
            orderNumber: work.references.length + 1,
            unstructuredCitation: '',
          });
        });
      }

      // Fundings
      const publishersWithFundings = publishers.filter((publisher) => publisher.PublishingRole === '16');

      publishersWithFundings.forEach(async (publisherWithFunding) => {
        const identifiers = Array.isArray(publisherWithFunding.PublisherIdentifier)
          ? publisherWithFunding.PublisherIdentifier
          : [publisherWithFunding.PublisherIdentifier];

        const ror = identifiers.find((identifier) => identifier.PublisherIDType === '40')?.IDValue ?? '';

        if (!ror || ror.length === 0) return;

        const institutions = await institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, ror);

        if (institutions.length === 0 || !institutions[0]) return;

        const selectedInstitution = institutions[0];

        // @ts-expect-error not exist in library types
        const fundings = Array.isArray(publisherWithFunding.Funding)
          ? // @ts-expect-error not exist in library types
            publisherWithFunding.Funding
          : // @ts-expect-error not exist in library types
            [publisherWithFunding.Funding];

        fundings.forEach((funding: Partial<{ FundingIdentifier: { IDTypeName: string; IDValue: string }[] }>) => {
          if (!funding || !funding?.FundingIdentifier) return;

          const identifiers = Array.isArray(funding.FundingIdentifier)
            ? funding.FundingIdentifier
            : [funding.FundingIdentifier];
          const program = identifiers.find((identifier) => identifier?.IDTypeName === 'programname')?.IDValue ?? '';
          const projectName = identifiers.find((identifier) => identifier?.IDTypeName === 'projectname')?.IDValue ?? '';
          const projectShortname =
            identifiers.find((identifier) => identifier?.IDTypeName === 'projectshortname')?.IDValue ?? '';
          const grantNumber = identifiers.find((identifier) => identifier?.IDTypeName === 'grantnumber')?.IDValue ?? '';
          const jurisdiction =
            identifiers.find((identifier) => identifier?.IDTypeName === 'jurisdiction')?.IDValue ?? '';

          const newFunding = getDefaultFunding({
            program,
            projectName,
            projectShortname,
            grantNumber,
            jurisdiction,
            institutionId: selectedInstitution.id,
            institutionName: selectedInstitution.name,
            institutionRor: selectedInstitution.ror,
          });

          work.fundings.push(newFunding);
        });
      });

      // Contributors
      if (DescriptiveDetail?.Contributor) {
        const contributors = Array.isArray(DescriptiveDetail?.Contributor)
          ? DescriptiveDetail?.Contributor
          : [DescriptiveDetail?.Contributor];

        const multipleContributions: MultipleFoundedContributors = {
          [workId]: {},
        };

        contributors.forEach(async (contributor) => {
          const role = getContributorRoleFromXml(contributor.ContributorRole);
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

          if (newContributor.fullName === 0) return;

          // Instititutions
          if (affiliationInstitutionRor && !fetchedInstitutions[affiliationInstitutionRor]) {
            const institutions = await institutionService.getInstitutions(
              0,
              appConfig.data.maxItemsPerRequestLimit,
              `${affiliationInstitutionRor}`,
            );

            if (institutions.length > 0) {
              fetchedInstitutions[affiliationInstitutionRor] = institutions[0];
            }
          }

          const affiliation = fetchedInstitutions[affiliationInstitutionRor]
            ? getDefaultAffiliation({
                institutionId: fetchedInstitutions[affiliationInstitutionRor].id,
                institutionName: fetchedInstitutions[affiliationInstitutionRor].name,
                rorId: fetchedInstitutions[affiliationInstitutionRor].ror,
                position: affiliationPosition,
              })
            : null;

          const biographies = biography
            ? [
                {
                  id: defaultId,
                  canonical: true,
                  content: `${biography}`,
                  localeCode: LocaleCode.En,
                  contributionId: defaultId,
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
            contributorId: defaultId,
            affiliations: affiliation ? [affiliation] : [],
          });

          work.contributions.push(contributionWithNewContributor);

          const multipleContributionsItemId = uuidv4();

          multipleContributions[workId][multipleContributionsItemId] = [
            { ...contributionWithNewContributor, selected: true, lastContribution: '' },
          ];

          const foundedContributors = await contributorService.getContributors(newContributor.fullName);

          if (foundedContributors.length === 0) return;

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

            work.contributions.push(contribution);
            multipleContributions[workId][multipleContributionsItemId].push({
              ...contribution,
              selected: false,
              lastContribution: foundedContributor.lastContributionTitle,
            });
          });
        });

        setMultipleFoundedContributors((prev) => ({
          ...prev,
          ...multipleContributions,
        }));
      }

      setWorks((prev) => [...prev, work]);

      // Series
      const seriesCollection = Array.isArray(DescriptiveDetail?.Collection)
        ? DescriptiveDetail?.Collection[0]
        : DescriptiveDetail?.Collection;
      const seriesName = seriesCollection?.TitleDetail?.TitleElement?.TitleText ?? '';
      const existingSeries = serieses.find((series) => series.name === seriesName);
      // @ts-expect-error not exist in library types
      const collectionSequence = seriesCollection?.CollectionSequence ?? 1;
      const orderNumber = collectionSequence.CollectionSequenceNumber
        ? parseInt(collectionSequence.CollectionSequenceNumber)
        : 1;

      if (!existingSeries) return;

      const existingData = seriesForUpdate[existingSeries.id] ?? [];
      const updatedSeriesData = {
        ...seriesForUpdate,
        [existingSeries.id]: [...existingData, { ...work, orderNumber }],
      };
      setSeriesForUpdate(updatedSeriesData);
    });

    if (errors.length > 0) {
      onValidationFailure?.(errors);
      return;
    }
  };

  useEffect(() => {
    validateXMLFile(file);
  }, [file]);

  const handleSelectContributor = (workId: WorkId, itemId: string, contributorId: ContributorId) => {
    const selectedWork = multipleFoundedContributors[workId];

    if (!selectedWork) return;

    const selectedItems = selectedWork[itemId];

    if (!selectedItems) return;

    const updatedContributors = selectedItems.map((item) => {
      if (item.contributorId !== contributorId) return { ...item, selected: false };

      return { ...item, selected: true };
    });

    setMultipleFoundedContributors((prev) => ({
      ...prev,
      [workId]: {
        ...prev[workId],
        [itemId]: updatedContributors,
      },
    }));
  };

  const handleSubmit = () => {
    const updatedWorks: WorkEntity[] = [];

    Object.entries(multipleFoundedContributors).forEach(([workId, data]) => {
      const work = works.find((work) => work.id === workId);

      if (!work) return;

      const appliedContributions: WorkContribution[] = [];

      Object.entries(data).forEach(([_itemId, contributions]) => {
        const contribution = contributions.find(({ selected }) => selected);

        if (!contribution) return;

        const { selected, lastContribution, ...contributionData } = contribution;

        appliedContributions.push(contributionData);
      });

      const updatedWork = {
        ...work,
        contributions: appliedContributions.length > 0 ? appliedContributions : work.contributions,
      };

      updatedWorks.push(updatedWork);
    });

    const updatedWorksIds = updatedWorks.map((work) => work.id);
    const notUpdatedWorks = works.filter((work) => !updatedWorksIds.includes(work.id));

    console.log('Works', [...notUpdatedWorks, ...updatedWorks]);
    console.log('Chapters', chapters);
    console.log('Series', seriesForUpdate);
  };

  if (isDataEmpty) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      <Typography variant="h1" component="h2">
        Multiple contributors found
      </Typography>
      {showContributorsSelection && (
        <TableWrapper>
          <TableHeader
            cells={['Work', 'Search Value', 'Contributors']}
            cellStyles={['min-w-[210px]', 'min-w-[210px]', 'min-w-[210px]']}
          />
          <TableBody>
            {Object.entries(multipleFoundedContributors).map(([workId, data]) => {
              const work = works.find((work) => work.id === workId);

              if (!work) return null;

              const contributions = Object.entries(data);

              return contributions.map(([itemId, contributions]) => {
                const defaultContributor = contributions.find(({ contributorId }) => isDefaultId(contributorId));

                if (contributions.length < 2) return null;

                return (
                  <TableRow key={`${workId}-${itemId}`} className="group">
                    {/* TODO: fix titles */}
                    <TableCell className="firstCell">{work.titles.map((title) => title.title).join(', ')}</TableCell>
                    <TableCell className="middleCell">{defaultContributor?.fullName ?? ''}</TableCell>
                    <TableCell className="lastCell">
                      {contributions.map(({ id, fullName, orcidId, contributorId, lastContribution, selected }) => (
                        <div key={id} className="flex items-center gap-2 [&:not(:first-child)&:not(:last-child)]:my-4">
                          <Radio
                            checked={selected}
                            onChange={() => handleSelectContributor(workId, itemId, contributorId)}
                            className="self-start"
                          />
                          <Typography className="flex flex-col gap-2">
                            {isDefaultId(contributorId) ? (
                              'Create new'
                            ) : (
                              <>
                                <Typography className="flex items-center gap-1" fontWeight="bold" component="span">
                                  {fullName}
                                  {orcidId && (
                                    <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                                      <OrchidLogo />
                                    </LinkTooltip>
                                  )}
                                </Typography>
                                {lastContribution && lastContribution.length > 0 && (
                                  <Typography component="span">Latest contribution to: {lastContribution}</Typography>
                                )}
                              </>
                            )}
                          </Typography>
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </TableWrapper>
      )}
      <Button variant="contained" color="primary" className="m-auto" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};
