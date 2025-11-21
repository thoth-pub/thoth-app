import { validateXml } from '@/app/actions/validateXml';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import {
  appConfig,
  getDefaultPublication,
  getDefaultWork,
  getPublicationType,
  isValidPublicationForm,
  LanguageRelation,
  SubjectTypes,
  type FormFieldOption,
} from '@/src/shared';
import { Typography } from '@/src/shared/ui';
import { useEffect, useState } from 'react';
import { OnixData } from './utils/types';
import { v4 as uuidv4 } from 'uuid';
import { MeasureType, MeasureUnit, ProductIdentifierType } from '@5stones/onix/dist/enums';
import { languageOptions, licenseOptions } from '@/src/shared/constants/formFields';
import { LanguageCode } from '@/gql/graphql';
import { Publisher } from '@5stones/onix/dist/interfaces';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationSuccess?: (data: WorkEntity[]) => void;
  onValidationFailure?: (errors: string[]) => void;
};

const defaultId = appConfig.defaultId;

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure } = props;

  const imprintsLabels = imprints.map((imprint) => imprint.label);

  const [xmlData, setXmlData] = useState<OnixData | null>(null);

  const validateXMLFile = async (file: File) => {
    const response = await validateXml(file);

    if (response.status === 'error') {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const { data } = response;
    const errors: string[] = [];
    const convertedProductsIntoWorks: WorkEntity[] = [];

    if (!data) {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const { ONIXMessage } = data;

    if (!ONIXMessage || !ONIXMessage.Header || !ONIXMessage.Product) {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const xmlImprint = ONIXMessage.Header.Sender?.SenderName ?? '';
    const isImprintExists = imprints.some((option) => option.label === xmlImprint);

    if (!isImprintExists) {
      errors.push(`Imprint ${xmlImprint} not found, should be one of the following: ${imprintsLabels.join(', ')}`);
      return;
    }

    if (!ONIXMessage.Product || ONIXMessage.Product.length === 0) {
      errors.push('No products found in the XML file');
      return;
    }

    const uploadedProducts = Array.isArray(ONIXMessage.Product) ? ONIXMessage.Product : [ONIXMessage.Product];

    uploadedProducts.forEach((product, index) => {
      const productNumber = index + 1;

      const { ProductIdentifier = [], DescriptiveDetail, PublishingDetail } = product;

      const workId = uuidv4();

      console.log(product);

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

      const title = DescriptiveDetail?.TitleDetail?.TitleElement?.TitleText ?? '';
      const subtitle = DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle ?? '';

      // @ts-expect-error not exist in library types
      const edition = DescriptiveDetail?.Edition?.EditionNumber ?? 1;

      // @ts-expect-error not exist in library types
      const bibliographyNote = DescriptiveDetail?.IllustrationsNote?.IllustrationsNoteText ?? '';

      const pageCount = DescriptiveDetail?.Extent?.ExtentValue ?? 0;
      const imageCount =
        // @ts-expect-error not exist in library types
        DescriptiveDetail?.AncillaryContent?.find((ancillary) => ancillary.AncillaryContentType === '09')?.Number ?? 0;
      const tableCount =
        // @ts-expect-error not exist in library types
        DescriptiveDetail?.AncillaryContent?.find((ancillary) => ancillary.AncillaryContentType === '11')?.Number ?? 0;
      const audioCount =
        // @ts-expect-error not exist in library types
        DescriptiveDetail?.AncillaryContent?.find((ancillary) => ancillary.AncillaryContentType === '19')?.Number ?? 0;
      const videoCount =
        // @ts-expect-error not exist in library types
        DescriptiveDetail?.AncillaryContent?.find((ancillary) => ancillary.AncillaryContentType === '00')?.Number ?? 0;

      const enteredPublishers = PublishingDetail?.Publisher ?? ([] as Publisher[]);
      const publishers = Array.isArray(enteredPublishers) ? enteredPublishers : [enteredPublishers];

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
        doi,
        oclc,
        references: [],
        license: license?.value ?? '',
        title,
        subtitle,
        edition,
        bibliographyNote,
        landingPage: websiteWithLandingPage?.WebsiteLink ?? '',
        pageCount: Number(pageCount),
        imageCount: Number(imageCount),
        tableCount: Number(tableCount),
        audioCount: Number(audioCount),
        videoCount: Number(videoCount),
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

        const publication = getDefaultPublication({
          isbn: product.RecordReference ?? '',
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
        });

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

      // Fundings
      console.log(work);
      // TODO series
    });

    if (errors.length > 0) {
      onValidationFailure?.(errors);
      return;
    }

    // setXmlData(data ?? null);
  };

  useEffect(() => {
    validateXMLFile(file);
  }, [file]);

  return (
    <div>
      {xmlData && typeof xmlData === 'string' && (
        <Typography variant="body2" component="pre">
          {JSON.parse(JSON.stringify(xmlData, null, 2))}
        </Typography>
      )}
    </div>
  );
};
