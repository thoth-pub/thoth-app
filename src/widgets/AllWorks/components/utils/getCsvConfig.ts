import {
  ContributorTypes,
  FormFieldOption,
  WorkStatuses,
  workStatusValidation,
  WorkTypes,
  workTypeValidation,
} from '@/src/shared';
import { CSV_KEYS } from '@/src/shared/constants/csvKeys';
import { CSVFieldType } from '../CSVParse';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { editionValidation, subtitleValidation, titleValidation } from '@/src/entities/work/model/work.validation';

const {
  PUBLISHER,
  WORK_TYPE,
  WORK_STATUS,
  TITLE,
  SUBTITLE,
  EDITION,
  PUBLICATION_DATE,
  WITHDRAWN_DATE,
  PLACE_OF_PUBLICATION,
  COVER_URL,
  DOI,
  PAGE_COUNT,
  PAGE_BREAKDOWN,
  IMAGE_COUNT,
  TABLE_COUNT,
  AUDIO_COUNT,
  VIDEO_COUNT,
  LICENSE,
  COPYRIGHT_HOLDER,
  LANDING_PAGE,
  SHORT_ABSTRACT,
  LONG_ABSTRACT,
  CONTRIBUTION_1_FIRST_NAME,
  CONTRIBUTION_1_LAST_NAME,
  CONTRIBUTION_1_ROLE,
  CONTRIBUTION_1_BIOGRAPHY,
  CONTRIBUTION_1_ORCID,
  CONTRIBUTION_1_WEBSITE,
  CONTRIBUTION_1_AFFILIATION_POSITION,
  CONTRIBUTION_1_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_1_AFFILIATION_INSTITUTION_ROR,
  SERIES_NAME,
  SERIES_ISSN,
  SERIES_ISSN_NUMBER,
} = CSV_KEYS;

export const getCsvConfig = (
  imprints: FormFieldOption[],
  licenseOptions: FormFieldOption[],
  serieses: SeriesEntity[],
) => {
  const imprintLabels = imprints.map((imprint) => imprint.label);

  const csvConfig = {
    headers: [
      {
        name: 'publisher',
        inputName: PUBLISHER,
        required: true,
        requiredError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is required in the ${rowNumber} row / ${columnNumber} column`;
        },
        validate: (field: CSVFieldType) => imprintLabels.includes(`${field}`),
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column. Publisher should be one of the following: ${imprintLabels.join(', ')}`;
        },
      },
      {
        name: 'work_type',
        inputName: WORK_TYPE,
        required: true,
        validate: (field: CSVFieldType) => workTypeValidation.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, work type should be one of the following: ${WorkTypes.options.join(', ')}`;
        },
      },
      {
        name: 'work_status',
        inputName: WORK_STATUS,
        required: true,
        validate: (field: CSVFieldType) => workStatusValidation.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, work status should be one of the following: ${WorkStatuses.options.join(', ')}`;
        },
      },
      {
        name: 'title',
        inputName: TITLE,
        required: true,
        validate: (field: CSVFieldType) => titleValidation.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column`;
        },
      },
      {
        name: 'subtitle',
        inputName: SUBTITLE,
        required: false,
        validate: (field: CSVFieldType) => subtitleValidation.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column`;
        },
      },
      {
        name: 'edition',
        inputName: EDITION,
        required: false,
        validate: (field: CSVFieldType) => editionValidation.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column`;
        },
      },
      {
        name: 'publication_date',
        inputName: PUBLICATION_DATE,
        required: false,
      },
      {
        name: 'withdrawn_date',
        inputName: WITHDRAWN_DATE,
        required: false,
      },
      {
        name: 'place_of_publication',
        inputName: PLACE_OF_PUBLICATION,
        required: false,
      },
      {
        name: 'cover_url',
        inputName: COVER_URL,
        required: false,
      },
      {
        name: 'doi',
        inputName: DOI,
        required: false,
      },
      {
        name: 'page_count',
        inputName: PAGE_COUNT,
        required: false,
      },
      {
        name: 'page_breakdown',
        inputName: PAGE_BREAKDOWN,
        required: false,
      },
      {
        name: 'image_count',
        inputName: IMAGE_COUNT,
        required: false,
      },
      {
        name: 'table_count',
        inputName: TABLE_COUNT,
        required: false,
      },
      {
        name: 'audio_count',
        inputName: AUDIO_COUNT,
        required: false,
      },
      {
        name: 'video_count',
        inputName: VIDEO_COUNT,
        required: false,
      },
      {
        name: 'license',
        inputName: LICENSE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return licenseOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column`;
        },
      },
      {
        name: 'copyright_holder',
        inputName: COPYRIGHT_HOLDER,
        required: false,
      },
      {
        name: 'landing_page',
        inputName: LANDING_PAGE,
        required: false,
      },

      {
        name: 'short_abstract',
        inputName: SHORT_ABSTRACT,
        required: false,
      },
      {
        name: 'long_abstract',
        inputName: LONG_ABSTRACT,
        required: false,
      },
      { name: 'contribution_1_first_name', inputName: CONTRIBUTION_1_FIRST_NAME, required: false },
      { name: 'contribution_1_surname', inputName: CONTRIBUTION_1_LAST_NAME, required: false },
      {
        name: 'contribution_1_role',
        inputName: CONTRIBUTION_1_ROLE,
        required: false,
        validate: (field: CSVFieldType) => ContributorTypes.safeParse(`${field}`).success,
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_1_biography', inputName: CONTRIBUTION_1_BIOGRAPHY, required: false },
      { name: 'contribution_1_orcid', inputName: CONTRIBUTION_1_ORCID, required: false },
      { name: 'contribution_1_website', inputName: CONTRIBUTION_1_WEBSITE, required: false },
      {
        name: 'contribution_1_affiliation_position',
        inputName: CONTRIBUTION_1_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_1_affiliation_institution_name',
        inputName: CONTRIBUTION_1_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_1_affiliation_institution_ror',
        inputName: CONTRIBUTION_1_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },
      // { name: 'original_language', inputName: 'originalLanguage', required: false },
      // { name: 'translated_from_language', inputName: 'translatedFromLanguage', required: false },
      // { name: 'translated_into_language', inputName: 'translatedIntoLanguage', required: false },
      // { name: 'thema_subjects', inputName: 'themaSubjects', required: false },
      // { name: 'bic_subjects', inputName: 'bicSubjects', required: false },
      // { name: 'bisac_subjects', inputName: 'bisacSubjects', required: false },
      // { name: 'keywords', inputName: 'keywords', required: false },
      // { name: 'publication_paperback_isbn', inputName: 'publicationPaperbackIsbn', required: false },
      // {
      //   name: 'publication_paperback_price_1_currency_code',
      //   inputName: 'publicationPaperbackPrice1CurrencyCode',
      //   required: false,
      // },
      // {
      //   name: 'publication_paperback_price_1_unit_price',
      //   inputName: 'publicationPaperbackPrice1UnitPrice',
      //   required: false,
      // },
      // { name: 'publication_hardback_isbn', inputName: 'publicationHardbackIsbn', required: false },
      // {
      //   name: 'publication_hardback_price_1_currency_code',
      //   inputName: 'publicationHardbackPrice1CurrencyCode',
      //   required: false,
      // },
      // {
      //   name: 'publication_hardback_price_1_unit_price',
      //   inputName: 'publicationHardbackPrice1UnitPrice',
      //   required: false,
      // },
      // { name: 'publication_pdf_isbn', inputName: 'publicationPdfIsbn', required: false },
      // { name: 'publication_pdf_location_landing_page', inputName: 'publicationPdfLocationLandingPage', required: false },
      // { name: 'publication_pdf_location_full_text_url', inputName: 'publicationPdfLocationFullTextUrl', required: false },
      // { name: 'publication_pdf_location_platform', inputName: 'publicationPdfLocationPlatform', required: false },
      {
        name: 'series_name',
        inputName: SERIES_NAME,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return serieses.some((series) => series.name === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, series should be one of the following: ${serieses.map((series) => series.name).join(', ')}`;
        },
      },
      { name: 'series_issn', inputName: SERIES_ISSN, required: false },
      { name: 'series_issue_number', inputName: SERIES_ISSN_NUMBER, required: false },
    ],
  };

  return csvConfig;
};
