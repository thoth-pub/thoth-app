import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  dateValidation,
  getRequiredStringValidation,
  getRequiredUrlValidation,
  optionalDateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  timestampValidation,
  workStatusValidation,
} from '@/src/shared/utils/validations';

const {
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

export const createWorkValidationSchema = z.object({
  [TITLE.name]: titleValidation,
  [IMPRINT.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
  [LICENSE.name]: licenseValidation,
});

export const titleValidationSchema = z.object({
  [WORK_TITLE.name]: titleValidation,
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

export const licenseValidationSchema = z.object({
  [LICENSE.name]: licenseValidation,
});

export const copyrightHolderValidationSchema = z.object({
  [COPYRIGHT_HOLDER.name]: copyrightHolderValidation,
});

export const landingPageValidationSchema = z.object({
  [LANDING_PAGE.name]: landingPageValidation,
});

export const coverUrlValidationSchema = z.object({
  [COVER_URL.name]: coverUrlValidation,
});
