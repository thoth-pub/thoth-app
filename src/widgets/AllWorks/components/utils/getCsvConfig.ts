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
import { currencyOptions, languageOptions } from '@/src/shared/constants/formFields';
import { LocationPlatform } from '@/gql/graphql';
import z from 'zod';

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
  ORIGINAL_LANGUAGE,
  TRANSLATED_FROM_LANGUAGE,
  TRANSLATED_INTO_LANGUAGE,
  THEMA_SUBJECTS,
  BIC_SUBJECTS,
  BISAC_SUBJECTS,
  LCC_SUBJECTS,
  KEYWORDS,
  PUBLICATION_PAPERBACK_ISBN,
  PUBLICATION_PAPERBACK_PRICE_1_CURRENCY_CODE,
  PUBLICATION_PAPERBACK_PRICE_1_UNIT_PRICE,
  PUBLICATION_HARDBACK_ISBN,
  PUBLICATION_HARDBACK_PRICE_1_CURRENCY_CODE,
  PUBLICATION_HARDBACK_PRICE_1_UNIT_PRICE,
  PUBLICATION_PDF_ISBN,
  PUBLICATION_PDF_LOCATION_LANDING_PAGE,
  PUBLICATION_PDF_LOCATION_FULL_TEXT_URL,
  PUBLICATION_PDF_LOCATION_PLATFORM,
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
      {
        name: 'original_language',
        inputName: ORIGINAL_LANGUAGE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return languageOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, original language should be one of the following: ${languageOptions.map((option) => option.value).join(', ')}`;
        },
      },
      {
        name: 'translated_from_language',
        inputName: TRANSLATED_FROM_LANGUAGE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return languageOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, translated from language should be one of the following: ${languageOptions.map((option) => option.value).join(', ')}`;
        },
      },
      {
        name: 'translated_into_language',
        inputName: TRANSLATED_INTO_LANGUAGE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return languageOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, translated into language should be one of the following: ${languageOptions.map((option) => option.value).join(', ')}`;
        },
      },
      { name: 'thema_subjects', inputName: THEMA_SUBJECTS, required: false },
      { name: 'bic_subjects', inputName: BIC_SUBJECTS, required: false },
      { name: 'bisac_subjects', inputName: BISAC_SUBJECTS, required: false },
      { name: 'lcc_subjects', inputName: LCC_SUBJECTS, required: false },
      { name: 'keywords', inputName: KEYWORDS, required: false },
      { name: 'publication_paperback_isbn', inputName: PUBLICATION_PAPERBACK_ISBN, required: false },
      {
        name: 'publication_paperback_price_1_currency_code',
        inputName: PUBLICATION_PAPERBACK_PRICE_1_CURRENCY_CODE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return currencyOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, publication paperback price 1 currency code should be one of the following: ${currencyOptions.map((option) => option.value).join(', ')}`;
        },
      },
      {
        name: 'publication_paperback_price_1_unit_price',
        inputName: PUBLICATION_PAPERBACK_PRICE_1_UNIT_PRICE,
        required: false,
      },
      { name: 'publication_hardback_isbn', inputName: PUBLICATION_HARDBACK_ISBN, required: false },
      {
        name: 'publication_hardback_price_1_currency_code',
        inputName: PUBLICATION_HARDBACK_PRICE_1_CURRENCY_CODE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return currencyOptions.some((option) => option.value === data);
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, publication hardback price 1 currency code should be one of the following: ${currencyOptions.map((option) => option.value).join(', ')}`;
        },
      },
      {
        name: 'publication_hardback_price_1_unit_price',
        inputName: PUBLICATION_HARDBACK_PRICE_1_UNIT_PRICE,
        required: false,
      },
      { name: 'publication_pdf_isbn', inputName: PUBLICATION_PDF_ISBN, required: false },
      {
        name: 'publication_pdf_location_landing_page',
        inputName: PUBLICATION_PDF_LOCATION_LANDING_PAGE,
        required: false,
      },
      {
        name: 'publication_pdf_location_full_text_url',
        inputName: PUBLICATION_PDF_LOCATION_FULL_TEXT_URL,
        required: false,
      },
      {
        name: 'publication_pdf_location_platform',
        inputName: PUBLICATION_PDF_LOCATION_PLATFORM,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return z.enum(LocationPlatform).safeParse(data).success;
        },
      },
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
