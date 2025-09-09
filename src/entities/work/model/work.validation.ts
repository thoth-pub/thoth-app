import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import {
  dateValidation,
  getRequiredStringValidation,
  getRequiredUrlValidation,
  optionalDateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  requiredIntValidation,
  timestampValidation,
  workStatusValidation,
} from '@/src/shared/utils/validations';

const { TITLE, LICENSE, IMPRINT_ID, WORK_TYPE, WORK_STATUS, PUBLICATION_DATE, WORK_TITLE } = FORM_FIELDS;

export const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
export const imprintValidation = getRequiredStringValidation(IMPRINT_ID.errorMessage);
export const workTypeValidation = getRequiredStringValidation(WORK_TYPE.errorMessage);

const statusValidation = workStatusValidation;
export const publicationDateValidation = optionalDateValidation;

const subtitleValidation = optionalStringValidation;
const reference = optionalStringValidation;

const editionValidation = requiredIntValidation;

const withdrawnDateValidation = dateValidation;

const placeValidation = optionalStringValidation;

const pagesCountValidation = optionalPositiveIntValidation;

const imageCountValidation = optionalPositiveIntValidation;

const tableCountValidation = optionalPositiveIntValidation;

const audioCountValidation = optionalPositiveIntValidation;

const videoCountValidation = optionalPositiveIntValidation;

const licenseValidation = getRequiredUrlValidation();

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
  [IMPRINT_ID.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
  [LICENSE.name]: licenseValidation,
});

export const editWorkValidationSchema = z.object({
  [WORK_STATUS.name]: statusValidation,
  [PUBLICATION_DATE.name]: publicationDateValidation,
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
