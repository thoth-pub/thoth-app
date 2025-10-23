import z from 'zod';

import { ERRORS } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  doiValidation,
  getFileValidation,
  getRequiredStringValidation,
  getRequiredUrlValidation,
  languageValidation,
  optionalDateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  workStatusValidation,
} from '@/src/shared/utils/validations';

const {
  DOI,
  TITLE,
  LICENSE,
  IMPRINT,
  WORK_TYPE,
  WORK_STATUS,
  PUBLICATION_DATE,
  WORK_TITLE,
  EDITION,
  COPYRIGHT_HOLDER,
  LANDING_PAGE,
  COVER_URL,
  SUBTITLE,
  LANGUAGE,
  TITLES,
  WORK_IMAGE_COUNT,
  WORK_TABLE_COUNT,
  WORK_AUDIO_COUNT,
  WORK_VIDEO_COUNT,
  WORK_PAGES_COUNT,
  WORK_FRONTMATTER_COUNT,
  WORK_BACKMATTER_COUNT,
} = FORM_FIELDS;

export const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
export const imprintValidation = getRequiredStringValidation(IMPRINT.errorMessage);
export const workTypeValidation = getRequiredStringValidation(WORK_TYPE.errorMessage);

export const publicationDateValidation = optionalDateValidation;

const subtitleValidation = optionalStringValidation;

const editionValidation = optionalPositiveIntValidation;

const pagesCountValidation = optionalPositiveIntValidation;

const imageCountValidation = optionalPositiveIntValidation;

const tableCountValidation = optionalPositiveIntValidation;

const audioCountValidation = optionalPositiveIntValidation;

const videoCountValidation = optionalPositiveIntValidation;

const licenseValidation = z.object({
  value: getRequiredUrlValidation(),
});

const copyrightHolderValidation = optionalStringValidation;

const landingPageValidation = optionalUrlValidation;

const frontMatterCountValidation = optionalPositiveIntValidation;

const backMatterCountValidation = optionalPositiveIntValidation;

const coverUrlValidation = optionalUrlValidation;

const titleLanguageValidation = z.object({
  value: languageValidation,
});

export const createWorkValidationSchema = z.object({
  [TITLE.name]: titleValidation,
  [IMPRINT.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
  [LICENSE.name]: licenseValidation,
});

export const titleValidationSchema = z.object({
  [WORK_TITLE.name]: titleValidation,
  [SUBTITLE.name]: subtitleValidation,
  [LANGUAGE.name]: titleLanguageValidation,
});

export const workTitlesValidationSchema = z.object({
  [TITLES.name]: z.array(titleValidationSchema),
});

export const publicationDateValidationSchema = z.object({
  [PUBLICATION_DATE.name]: publicationDateValidation,
});

export const workStatusValidationSchema = z.object({
  [WORK_STATUS.name]: workStatusValidation,
});

export const editionValidationSchema = z.object({
  [EDITION.name]: editionValidation,
});

export const workTypeValidationSchema = z.object({
  [WORK_TYPE.name]: workTypeValidation,
});

export const imprintValidationSchema = z.object({
  [IMPRINT.name]: imprintValidation,
});

export const licenseAndCopyrightHolderValidationSchema = z.object({
  [LICENSE.name]: licenseValidation,
  [COPYRIGHT_HOLDER.name]: copyrightHolderValidation,
});

export const doiAndCoversValidationSchema = z.object({
  [DOI.name]: doiValidation,
  [LANDING_PAGE.name]: landingPageValidation,
  [COVER_URL.name]: coverUrlValidation,
});

export const mediaValidationSchema = z.object({
  [WORK_IMAGE_COUNT.name]: imageCountValidation,
  [WORK_TABLE_COUNT.name]: tableCountValidation,
  [WORK_AUDIO_COUNT.name]: audioCountValidation,
  [WORK_VIDEO_COUNT.name]: videoCountValidation,
});

export const pagesCountValidationSchema = z.object({
  [WORK_PAGES_COUNT.name]: pagesCountValidation,
  [WORK_FRONTMATTER_COUNT.name]: frontMatterCountValidation,
  [WORK_BACKMATTER_COUNT.name]: backMatterCountValidation,
});

export const coverUrlValidationSchema = z.object({
  [COVER_URL.name]: getFileValidation(
    appConfig.supportedFileTypes,
    ERRORS.FILE_FORMAT_INVALID,
    ERRORS.MAX_FILE_SIZE_EXCEEDED,
  ),
});
