import isbn3 from 'isbn3';
import z from 'zod';

import { LocationPlatform } from '@/gql/graphql';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import {
  editionValidation,
  subtitleValidation,
  titleValidation,
  workTypeValidation,
} from '@/src/entities/work/model/work.validation';
import { ContributorTypes, currencyOptions, languageOptions, WorkStatuses, WorkTypes } from '@/src/shared/constants';
import { CSV_KEYS } from '@/src/shared/constants/csvKeys';

import { CSVFieldType } from '../../../widgets/AllWorks/components/CSVParse';
import { FormFieldOption } from '../../interfaces';
import { workStatusValidation } from '../../utils';

const {
  IMPRINT,
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
  CONTRIBUTION_2_FIRST_NAME,
  CONTRIBUTION_2_LAST_NAME,
  CONTRIBUTION_2_ROLE,
  CONTRIBUTION_2_BIOGRAPHY,
  CONTRIBUTION_2_ORCID,
  CONTRIBUTION_2_WEBSITE,
  CONTRIBUTION_2_AFFILIATION_POSITION,
  CONTRIBUTION_2_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_2_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_3_FIRST_NAME,
  CONTRIBUTION_3_LAST_NAME,
  CONTRIBUTION_3_ROLE,
  CONTRIBUTION_3_BIOGRAPHY,
  CONTRIBUTION_3_ORCID,
  CONTRIBUTION_3_WEBSITE,
  CONTRIBUTION_3_AFFILIATION_POSITION,
  CONTRIBUTION_3_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_3_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_4_FIRST_NAME,
  CONTRIBUTION_4_LAST_NAME,
  CONTRIBUTION_4_ROLE,
  CONTRIBUTION_4_BIOGRAPHY,
  CONTRIBUTION_4_ORCID,
  CONTRIBUTION_4_WEBSITE,
  CONTRIBUTION_4_AFFILIATION_POSITION,
  CONTRIBUTION_4_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_4_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_5_FIRST_NAME,
  CONTRIBUTION_5_LAST_NAME,
  CONTRIBUTION_5_ROLE,
  CONTRIBUTION_5_BIOGRAPHY,
  CONTRIBUTION_5_ORCID,
  CONTRIBUTION_5_WEBSITE,
  CONTRIBUTION_5_AFFILIATION_POSITION,
  CONTRIBUTION_5_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_5_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_6_FIRST_NAME,
  CONTRIBUTION_6_LAST_NAME,
  CONTRIBUTION_6_ROLE,
  CONTRIBUTION_6_BIOGRAPHY,
  CONTRIBUTION_6_ORCID,
  CONTRIBUTION_6_WEBSITE,
  CONTRIBUTION_6_AFFILIATION_POSITION,
  CONTRIBUTION_6_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_6_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_7_FIRST_NAME,
  CONTRIBUTION_7_LAST_NAME,
  CONTRIBUTION_7_ROLE,
  CONTRIBUTION_7_BIOGRAPHY,
  CONTRIBUTION_7_ORCID,
  CONTRIBUTION_7_WEBSITE,
  CONTRIBUTION_7_AFFILIATION_POSITION,
  CONTRIBUTION_7_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_7_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_8_FIRST_NAME,
  CONTRIBUTION_8_LAST_NAME,
  CONTRIBUTION_8_ROLE,
  CONTRIBUTION_8_BIOGRAPHY,
  CONTRIBUTION_8_ORCID,
  CONTRIBUTION_8_WEBSITE,
  CONTRIBUTION_8_AFFILIATION_POSITION,
  CONTRIBUTION_8_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_8_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_9_FIRST_NAME,
  CONTRIBUTION_9_LAST_NAME,
  CONTRIBUTION_9_ROLE,
  CONTRIBUTION_9_BIOGRAPHY,
  CONTRIBUTION_9_ORCID,
  CONTRIBUTION_9_WEBSITE,
  CONTRIBUTION_9_AFFILIATION_POSITION,
  CONTRIBUTION_9_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_9_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_10_FIRST_NAME,
  CONTRIBUTION_10_LAST_NAME,
  CONTRIBUTION_10_ROLE,
  CONTRIBUTION_10_BIOGRAPHY,
  CONTRIBUTION_10_ORCID,
  CONTRIBUTION_10_WEBSITE,
  CONTRIBUTION_10_AFFILIATION_POSITION,
  CONTRIBUTION_10_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_10_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_11_FIRST_NAME,
  CONTRIBUTION_11_LAST_NAME,
  CONTRIBUTION_11_ROLE,
  CONTRIBUTION_11_BIOGRAPHY,
  CONTRIBUTION_11_ORCID,
  CONTRIBUTION_11_WEBSITE,
  CONTRIBUTION_11_AFFILIATION_POSITION,
  CONTRIBUTION_11_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_11_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_12_FIRST_NAME,
  CONTRIBUTION_12_LAST_NAME,
  CONTRIBUTION_12_ROLE,
  CONTRIBUTION_12_BIOGRAPHY,
  CONTRIBUTION_12_ORCID,
  CONTRIBUTION_12_WEBSITE,
  CONTRIBUTION_12_AFFILIATION_POSITION,
  CONTRIBUTION_12_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_12_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_13_FIRST_NAME,
  CONTRIBUTION_13_LAST_NAME,
  CONTRIBUTION_13_ROLE,
  CONTRIBUTION_13_BIOGRAPHY,
  CONTRIBUTION_13_ORCID,
  CONTRIBUTION_13_WEBSITE,
  CONTRIBUTION_13_AFFILIATION_POSITION,
  CONTRIBUTION_13_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_13_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_14_FIRST_NAME,
  CONTRIBUTION_14_LAST_NAME,
  CONTRIBUTION_14_ROLE,
  CONTRIBUTION_14_BIOGRAPHY,
  CONTRIBUTION_14_ORCID,
  CONTRIBUTION_14_WEBSITE,
  CONTRIBUTION_14_AFFILIATION_POSITION,
  CONTRIBUTION_14_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_14_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_15_FIRST_NAME,
  CONTRIBUTION_15_LAST_NAME,
  CONTRIBUTION_15_ROLE,
  CONTRIBUTION_15_BIOGRAPHY,
  CONTRIBUTION_15_ORCID,
  CONTRIBUTION_15_WEBSITE,
  CONTRIBUTION_15_AFFILIATION_POSITION,
  CONTRIBUTION_15_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_15_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_16_FIRST_NAME,
  CONTRIBUTION_16_LAST_NAME,
  CONTRIBUTION_16_ROLE,
  CONTRIBUTION_16_BIOGRAPHY,
  CONTRIBUTION_16_ORCID,
  CONTRIBUTION_16_WEBSITE,
  CONTRIBUTION_16_AFFILIATION_POSITION,
  CONTRIBUTION_16_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_16_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_17_FIRST_NAME,
  CONTRIBUTION_17_LAST_NAME,
  CONTRIBUTION_17_ROLE,
  CONTRIBUTION_17_BIOGRAPHY,
  CONTRIBUTION_17_ORCID,
  CONTRIBUTION_17_WEBSITE,
  CONTRIBUTION_17_AFFILIATION_POSITION,
  CONTRIBUTION_17_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_17_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_18_FIRST_NAME,
  CONTRIBUTION_18_LAST_NAME,
  CONTRIBUTION_18_ROLE,
  CONTRIBUTION_18_BIOGRAPHY,
  CONTRIBUTION_18_ORCID,
  CONTRIBUTION_18_WEBSITE,
  CONTRIBUTION_18_AFFILIATION_POSITION,
  CONTRIBUTION_18_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_18_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_19_FIRST_NAME,
  CONTRIBUTION_19_LAST_NAME,
  CONTRIBUTION_19_ROLE,
  CONTRIBUTION_19_BIOGRAPHY,
  CONTRIBUTION_19_ORCID,
  CONTRIBUTION_19_WEBSITE,
  CONTRIBUTION_19_AFFILIATION_POSITION,
  CONTRIBUTION_19_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_19_AFFILIATION_INSTITUTION_ROR,
  CONTRIBUTION_20_FIRST_NAME,
  CONTRIBUTION_20_LAST_NAME,
  CONTRIBUTION_20_ROLE,
  CONTRIBUTION_20_BIOGRAPHY,
  CONTRIBUTION_20_ORCID,
  CONTRIBUTION_20_WEBSITE,
  CONTRIBUTION_20_AFFILIATION_POSITION,
  CONTRIBUTION_20_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_20_AFFILIATION_INSTITUTION_ROR,
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
  SERIES_ISSUE_NUMBER,
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
        name: 'imprint',
        inputName: IMPRINT,
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
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
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
      { name: 'contribution_2_first_name', inputName: CONTRIBUTION_2_FIRST_NAME, required: false },
      { name: 'contribution_2_surname', inputName: CONTRIBUTION_2_LAST_NAME, required: false },
      {
        name: 'contribution_2_role',
        inputName: CONTRIBUTION_2_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_2_biography', inputName: CONTRIBUTION_2_BIOGRAPHY, required: false },
      { name: 'contribution_2_orcid', inputName: CONTRIBUTION_2_ORCID, required: false },
      { name: 'contribution_2_website', inputName: CONTRIBUTION_2_WEBSITE, required: false },
      {
        name: 'contribution_2_affiliation_position',
        inputName: CONTRIBUTION_2_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_2_affiliation_institution_name',
        inputName: CONTRIBUTION_2_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_2_affiliation_institution_ror',
        inputName: CONTRIBUTION_2_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },
      { name: 'contribution_3_first_name', inputName: CONTRIBUTION_3_FIRST_NAME, required: false },
      { name: 'contribution_3_surname', inputName: CONTRIBUTION_3_LAST_NAME, required: false },
      {
        name: 'contribution_3_role',
        inputName: CONTRIBUTION_3_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_3_biography', inputName: CONTRIBUTION_3_BIOGRAPHY, required: false },
      { name: 'contribution_3_orcid', inputName: CONTRIBUTION_3_ORCID, required: false },
      { name: 'contribution_3_website', inputName: CONTRIBUTION_3_WEBSITE, required: false },
      {
        name: 'contribution_3_affiliation_position',
        inputName: CONTRIBUTION_3_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_3_affiliation_institution_name',
        inputName: CONTRIBUTION_3_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_3_affiliation_institution_ror',
        inputName: CONTRIBUTION_3_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_4_first_name', inputName: CONTRIBUTION_4_FIRST_NAME, required: false },
      { name: 'contribution_4_surname', inputName: CONTRIBUTION_4_LAST_NAME, required: false },
      {
        name: 'contribution_4_role',
        inputName: CONTRIBUTION_4_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_4_biography', inputName: CONTRIBUTION_4_BIOGRAPHY, required: false },
      { name: 'contribution_4_orcid', inputName: CONTRIBUTION_4_ORCID, required: false },
      { name: 'contribution_4_website', inputName: CONTRIBUTION_4_WEBSITE, required: false },
      {
        name: 'contribution_4_affiliation_position',
        inputName: CONTRIBUTION_4_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_4_affiliation_institution_name',
        inputName: CONTRIBUTION_4_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_4_affiliation_institution_ror',
        inputName: CONTRIBUTION_4_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_5_first_name', inputName: CONTRIBUTION_5_FIRST_NAME, required: false },
      { name: 'contribution_5_surname', inputName: CONTRIBUTION_5_LAST_NAME, required: false },
      {
        name: 'contribution_5_role',
        inputName: CONTRIBUTION_5_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_5_biography', inputName: CONTRIBUTION_5_BIOGRAPHY, required: false },
      { name: 'contribution_5_orcid', inputName: CONTRIBUTION_5_ORCID, required: false },
      { name: 'contribution_5_website', inputName: CONTRIBUTION_5_WEBSITE, required: false },
      {
        name: 'contribution_5_affiliation_position',
        inputName: CONTRIBUTION_5_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_5_affiliation_institution_name',
        inputName: CONTRIBUTION_5_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_5_affiliation_institution_ror',
        inputName: CONTRIBUTION_5_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_6_first_name', inputName: CONTRIBUTION_6_FIRST_NAME, required: false },
      { name: 'contribution_6_surname', inputName: CONTRIBUTION_6_LAST_NAME, required: false },
      {
        name: 'contribution_6_role',
        inputName: CONTRIBUTION_6_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_6_biography', inputName: CONTRIBUTION_6_BIOGRAPHY, required: false },
      { name: 'contribution_6_orcid', inputName: CONTRIBUTION_6_ORCID, required: false },
      { name: 'contribution_6_website', inputName: CONTRIBUTION_6_WEBSITE, required: false },
      {
        name: 'contribution_6_affiliation_position',
        inputName: CONTRIBUTION_6_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_6_affiliation_institution_name',
        inputName: CONTRIBUTION_6_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_6_affiliation_institution_ror',
        inputName: CONTRIBUTION_6_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_7_first_name', inputName: CONTRIBUTION_7_FIRST_NAME, required: false },
      { name: 'contribution_7_surname', inputName: CONTRIBUTION_7_LAST_NAME, required: false },
      {
        name: 'contribution_7_role',
        inputName: CONTRIBUTION_7_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_7_biography', inputName: CONTRIBUTION_7_BIOGRAPHY, required: false },
      { name: 'contribution_7_orcid', inputName: CONTRIBUTION_7_ORCID, required: false },
      { name: 'contribution_7_website', inputName: CONTRIBUTION_7_WEBSITE, required: false },
      {
        name: 'contribution_7_affiliation_position',
        inputName: CONTRIBUTION_7_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_7_affiliation_institution_name',
        inputName: CONTRIBUTION_7_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_7_affiliation_institution_ror',
        inputName: CONTRIBUTION_7_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_8_first_name', inputName: CONTRIBUTION_8_FIRST_NAME, required: false },
      { name: 'contribution_8_surname', inputName: CONTRIBUTION_8_LAST_NAME, required: false },
      {
        name: 'contribution_8_role',
        inputName: CONTRIBUTION_8_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_8_biography', inputName: CONTRIBUTION_8_BIOGRAPHY, required: false },
      { name: 'contribution_8_orcid', inputName: CONTRIBUTION_8_ORCID, required: false },
      { name: 'contribution_8_website', inputName: CONTRIBUTION_8_WEBSITE, required: false },
      {
        name: 'contribution_8_affiliation_position',
        inputName: CONTRIBUTION_8_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_8_affiliation_institution_name',
        inputName: CONTRIBUTION_8_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_8_affiliation_institution_ror',
        inputName: CONTRIBUTION_8_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_9_first_name', inputName: CONTRIBUTION_9_FIRST_NAME, required: false },
      { name: 'contribution_9_surname', inputName: CONTRIBUTION_9_LAST_NAME, required: false },
      {
        name: 'contribution_9_role',
        inputName: CONTRIBUTION_9_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_9_biography', inputName: CONTRIBUTION_9_BIOGRAPHY, required: false },
      { name: 'contribution_9_orcid', inputName: CONTRIBUTION_9_ORCID, required: false },
      { name: 'contribution_9_website', inputName: CONTRIBUTION_9_WEBSITE, required: false },
      {
        name: 'contribution_9_affiliation_position',
        inputName: CONTRIBUTION_9_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_9_affiliation_institution_name',
        inputName: CONTRIBUTION_9_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_9_affiliation_institution_ror',
        inputName: CONTRIBUTION_9_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_10_first_name', inputName: CONTRIBUTION_10_FIRST_NAME, required: false },
      { name: 'contribution_10_surname', inputName: CONTRIBUTION_10_LAST_NAME, required: false },
      {
        name: 'contribution_10_role',
        inputName: CONTRIBUTION_10_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_10_biography', inputName: CONTRIBUTION_10_BIOGRAPHY, required: false },
      { name: 'contribution_10_orcid', inputName: CONTRIBUTION_10_ORCID, required: false },
      { name: 'contribution_10_website', inputName: CONTRIBUTION_10_WEBSITE, required: false },
      {
        name: 'contribution_10_affiliation_position',
        inputName: CONTRIBUTION_10_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_10_affiliation_institution_name',
        inputName: CONTRIBUTION_10_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_10_affiliation_institution_ror',
        inputName: CONTRIBUTION_10_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_11_first_name', inputName: CONTRIBUTION_11_FIRST_NAME, required: false },
      { name: 'contribution_11_surname', inputName: CONTRIBUTION_11_LAST_NAME, required: false },
      {
        name: 'contribution_11_role',
        inputName: CONTRIBUTION_11_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_11_biography', inputName: CONTRIBUTION_11_BIOGRAPHY, required: false },
      { name: 'contribution_11_orcid', inputName: CONTRIBUTION_11_ORCID, required: false },
      { name: 'contribution_11_website', inputName: CONTRIBUTION_11_WEBSITE, required: false },
      {
        name: 'contribution_11_affiliation_position',
        inputName: CONTRIBUTION_11_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_11_affiliation_institution_name',
        inputName: CONTRIBUTION_11_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_11_affiliation_institution_ror',
        inputName: CONTRIBUTION_11_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_12_first_name', inputName: CONTRIBUTION_12_FIRST_NAME, required: false },
      { name: 'contribution_12_surname', inputName: CONTRIBUTION_12_LAST_NAME, required: false },
      {
        name: 'contribution_12_role',
        inputName: CONTRIBUTION_12_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_12_biography', inputName: CONTRIBUTION_12_BIOGRAPHY, required: false },
      { name: 'contribution_12_orcid', inputName: CONTRIBUTION_12_ORCID, required: false },
      { name: 'contribution_12_website', inputName: CONTRIBUTION_12_WEBSITE, required: false },
      {
        name: 'contribution_12_affiliation_position',
        inputName: CONTRIBUTION_12_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_12_affiliation_institution_name',
        inputName: CONTRIBUTION_12_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_12_affiliation_institution_ror',
        inputName: CONTRIBUTION_12_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_13_first_name', inputName: CONTRIBUTION_13_FIRST_NAME, required: false },
      { name: 'contribution_13_surname', inputName: CONTRIBUTION_13_LAST_NAME, required: false },
      {
        name: 'contribution_13_role',
        inputName: CONTRIBUTION_13_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_13_biography', inputName: CONTRIBUTION_13_BIOGRAPHY, required: false },
      { name: 'contribution_13_orcid', inputName: CONTRIBUTION_13_ORCID, required: false },
      { name: 'contribution_13_website', inputName: CONTRIBUTION_13_WEBSITE, required: false },
      {
        name: 'contribution_13_affiliation_position',
        inputName: CONTRIBUTION_13_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_13_affiliation_institution_name',
        inputName: CONTRIBUTION_13_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_13_affiliation_institution_ror',
        inputName: CONTRIBUTION_13_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_14_first_name', inputName: CONTRIBUTION_14_FIRST_NAME, required: false },
      { name: 'contribution_14_surname', inputName: CONTRIBUTION_14_LAST_NAME, required: false },
      {
        name: 'contribution_14_role',
        inputName: CONTRIBUTION_14_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_14_biography', inputName: CONTRIBUTION_14_BIOGRAPHY, required: false },
      { name: 'contribution_14_orcid', inputName: CONTRIBUTION_14_ORCID, required: false },
      { name: 'contribution_14_website', inputName: CONTRIBUTION_14_WEBSITE, required: false },
      {
        name: 'contribution_14_affiliation_position',
        inputName: CONTRIBUTION_14_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_14_affiliation_institution_name',
        inputName: CONTRIBUTION_14_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_14_affiliation_institution_ror',
        inputName: CONTRIBUTION_14_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_15_first_name', inputName: CONTRIBUTION_15_FIRST_NAME, required: false },
      { name: 'contribution_15_surname', inputName: CONTRIBUTION_15_LAST_NAME, required: false },
      {
        name: 'contribution_15_role',
        inputName: CONTRIBUTION_15_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_15_biography', inputName: CONTRIBUTION_15_BIOGRAPHY, required: false },
      { name: 'contribution_15_orcid', inputName: CONTRIBUTION_15_ORCID, required: false },
      { name: 'contribution_15_website', inputName: CONTRIBUTION_15_WEBSITE, required: false },
      {
        name: 'contribution_15_affiliation_position',
        inputName: CONTRIBUTION_15_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_15_affiliation_institution_name',
        inputName: CONTRIBUTION_15_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_15_affiliation_institution_ror',
        inputName: CONTRIBUTION_15_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_16_first_name', inputName: CONTRIBUTION_16_FIRST_NAME, required: false },
      { name: 'contribution_16_surname', inputName: CONTRIBUTION_16_LAST_NAME, required: false },
      {
        name: 'contribution_16_role',
        inputName: CONTRIBUTION_16_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_16_biography', inputName: CONTRIBUTION_16_BIOGRAPHY, required: false },
      { name: 'contribution_16_orcid', inputName: CONTRIBUTION_16_ORCID, required: false },
      { name: 'contribution_16_website', inputName: CONTRIBUTION_16_WEBSITE, required: false },
      {
        name: 'contribution_16_affiliation_position',
        inputName: CONTRIBUTION_16_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_16_affiliation_institution_name',
        inputName: CONTRIBUTION_16_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_16_affiliation_institution_ror',
        inputName: CONTRIBUTION_16_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_17_first_name', inputName: CONTRIBUTION_17_FIRST_NAME, required: false },
      { name: 'contribution_17_surname', inputName: CONTRIBUTION_17_LAST_NAME, required: false },
      {
        name: 'contribution_17_role',
        inputName: CONTRIBUTION_17_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_17_biography', inputName: CONTRIBUTION_17_BIOGRAPHY, required: false },
      { name: 'contribution_17_orcid', inputName: CONTRIBUTION_17_ORCID, required: false },
      { name: 'contribution_17_website', inputName: CONTRIBUTION_17_WEBSITE, required: false },
      {
        name: 'contribution_17_affiliation_position',
        inputName: CONTRIBUTION_17_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_17_affiliation_institution_name',
        inputName: CONTRIBUTION_17_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_17_affiliation_institution_ror',
        inputName: CONTRIBUTION_17_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_18_first_name', inputName: CONTRIBUTION_18_FIRST_NAME, required: false },
      { name: 'contribution_18_surname', inputName: CONTRIBUTION_18_LAST_NAME, required: false },
      {
        name: 'contribution_18_role',
        inputName: CONTRIBUTION_18_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_18_biography', inputName: CONTRIBUTION_18_BIOGRAPHY, required: false },
      { name: 'contribution_18_orcid', inputName: CONTRIBUTION_18_ORCID, required: false },
      { name: 'contribution_18_website', inputName: CONTRIBUTION_18_WEBSITE, required: false },
      {
        name: 'contribution_18_affiliation_position',
        inputName: CONTRIBUTION_18_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_18_affiliation_institution_name',
        inputName: CONTRIBUTION_18_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_18_affiliation_institution_ror',
        inputName: CONTRIBUTION_18_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_19_first_name', inputName: CONTRIBUTION_19_FIRST_NAME, required: false },
      { name: 'contribution_19_surname', inputName: CONTRIBUTION_19_LAST_NAME, required: false },
      {
        name: 'contribution_19_role',
        inputName: CONTRIBUTION_19_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_19_biography', inputName: CONTRIBUTION_19_BIOGRAPHY, required: false },
      { name: 'contribution_19_orcid', inputName: CONTRIBUTION_19_ORCID, required: false },
      { name: 'contribution_19_website', inputName: CONTRIBUTION_19_WEBSITE, required: false },
      {
        name: 'contribution_19_affiliation_position',
        inputName: CONTRIBUTION_19_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_19_affiliation_institution_name',
        inputName: CONTRIBUTION_19_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_19_affiliation_institution_ror',
        inputName: CONTRIBUTION_19_AFFILIATION_INSTITUTION_ROR,
        required: false,
      },

      { name: 'contribution_20_first_name', inputName: CONTRIBUTION_20_FIRST_NAME, required: false },
      { name: 'contribution_20_surname', inputName: CONTRIBUTION_20_LAST_NAME, required: false },
      {
        name: 'contribution_20_role',
        inputName: CONTRIBUTION_20_ROLE,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return ContributorTypes.safeParse(data).success;
        },
        validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
          return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column, contribution role should be one of the following: ${ContributorTypes.options.join(', ')}`;
        },
      },
      { name: 'contribution_20_biography', inputName: CONTRIBUTION_20_BIOGRAPHY, required: false },
      { name: 'contribution_20_orcid', inputName: CONTRIBUTION_20_ORCID, required: false },
      { name: 'contribution_20_website', inputName: CONTRIBUTION_20_WEBSITE, required: false },
      {
        name: 'contribution_20_affiliation_position',
        inputName: CONTRIBUTION_20_AFFILIATION_POSITION,
        required: false,
      },
      {
        name: 'contribution_20_affiliation_institution_name',
        inputName: CONTRIBUTION_20_AFFILIATION_INSTITUTION_NAME,
        required: false,
      },
      {
        name: 'contribution_20_affiliation_institution_ror',
        inputName: CONTRIBUTION_20_AFFILIATION_INSTITUTION_ROR,
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
      {
        name: 'publication_paperback_isbn',
        inputName: PUBLICATION_PAPERBACK_ISBN,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return isbn3.parse(data)?.isValid ?? false;
        },
      },
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
      {
        name: 'publication_hardback_isbn',
        inputName: PUBLICATION_HARDBACK_ISBN,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return isbn3.parse(data)?.isValid ?? false;
        },
      },
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
      {
        name: 'publication_pdf_isbn',
        inputName: PUBLICATION_PDF_ISBN,
        required: false,
        validate: (field: CSVFieldType) => {
          const data = `${field}`.trim();

          if (data.length === 0) return true;

          return isbn3.parse(data)?.isValid ?? false;
        },
      },
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
      { name: 'series_issue_number', inputName: SERIES_ISSUE_NUMBER, required: false },
    ],
  };

  return csvConfig;
};
