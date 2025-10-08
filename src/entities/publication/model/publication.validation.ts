import z from 'zod';

import { isbnValidation, optionalPositiveIntValidation, publicationTypeValidation } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const {
  PUBLICATION_TYPE,
  PUBLICATION_ISBN,
  PUBLICATION_WIDTH_MM,
  PUBLICATION_WIDTH_IN,
  PUBLICATION_HEIGHT_MM,
  PUBLICATION_HEIGHT_IN,
  PUBLICATION_DEPTH_MM,
  PUBLICATION_DEPTH_IN,
  PUBLICATION_WEIGHT_G,
  PUBLICATION_WEIGHT_OZ,
} = FORM_FIELDS;

const widthValidation = optionalPositiveIntValidation;
const heightValidation = optionalPositiveIntValidation;
const depthValidation = optionalPositiveIntValidation;
const weightValidation = optionalPositiveIntValidation;

export const publicationTypeValidationSchema = z.object({ [PUBLICATION_TYPE.name]: publicationTypeValidation });

export const isbnValidationSchema = z.object({ [PUBLICATION_ISBN.name]: isbnValidation });

export const dimensionsValidationSchema = z.object({
  [PUBLICATION_WIDTH_MM.name]: widthValidation,
  [PUBLICATION_WIDTH_IN.name]: widthValidation,
  [PUBLICATION_HEIGHT_MM.name]: heightValidation,
  [PUBLICATION_HEIGHT_IN.name]: heightValidation,
  [PUBLICATION_DEPTH_MM.name]: depthValidation,
  [PUBLICATION_DEPTH_IN.name]: depthValidation,
  [PUBLICATION_WEIGHT_G.name]: weightValidation,
  [PUBLICATION_WEIGHT_OZ.name]: weightValidation,
});
