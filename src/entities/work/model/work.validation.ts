import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  dateValidation,
  doiValidation,
  getRequiredStringValidation,
  getRequiredUrlValidation,
  languageValidation,
  optionalDateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  romanNumeralValidationOptional,
  timestampValidation,
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
} = FORM_FIELDS;

export const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
export const imprintValidation = getRequiredStringValidation(IMPRINT.errorMessage);
export const workTypeValidation = getRequiredStringValidation(WORK_TYPE.errorMessage);

const statusValidation = workStatusValidation;
export const publicationDateValidation = optionalDateValidation;

const subtitleValidation = optionalStringValidation;
const reference = optionalStringValidation;

const editionValidation = optionalPositiveIntValidation;

const withdrawnDateValidation = dateValidation;

const placeValidation = optionalStringValidation;

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

const frontmatterCountValidation = romanNumeralValidationOptional;

const backmatterCountValidation = romanNumeralValidationOptional;

const iccn = optionalStringValidation;

const oclcValidation = optionalStringValidation;

const shortAbstractValidation = optionalStringValidation;

const longAbstractValidation = optionalStringValidation;

const generalNoteValidation = optionalStringValidation;

const bibliographyNoteValidation = optionalStringValidation;

const tocValidation = optionalStringValidation;

const coverUrlValidation = optionalUrlValidation;

const coverCaptionValidation = optionalStringValidation;

const firstPageValidation = optionalStringValidation;

const lastPageValidation = optionalStringValidation;

const pageIntervalValidation = optionalStringValidation;

const updatedAtWithRelationsValidation = timestampValidation;

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
  [WORK_STATUS.name]: statusValidation,
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
  [WORK_FRONTMATTER_COUNT.name]: frontmatterCountValidation,
});
