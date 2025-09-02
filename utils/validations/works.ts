import z from 'zod';

import { FORM_FIELDS } from '@/constants';

import {
  dateValidation,
  getRequiredStringValidation,
  getRequiredUrlValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  requiredIntValidation,
  timestampValidation,
} from './core';

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
const imprintValidation = getRequiredStringValidation(IMPRINT.errorMessage);
const workTypeValidation = getRequiredStringValidation(WORK_TYPE.errorMessage);
const subtitleValidation = optionalStringValidation;
const reference = optionalStringValidation;

const editionValidation = requiredIntValidation;

const publicationDateValidation = dateValidation;
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
  [IMPRINT.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
  [LICENSE.name]: licenseValidation,
});
