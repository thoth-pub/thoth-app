import z from 'zod';

import {
  isbnValidation,
  lengthUnitValidation,
  optionalPositiveIntValidation,
  publicationTypeValidation,
  weightUnitValidation,
} from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';

const {
  PUBLICATION_TYPE,
  PUBLICATION_ISBN,
  PUBLICATION_WIDTH,
  PUBLICATION_HEIGHT,
  PUBLICATION_DEPTH,
  PUBLICATION_WEIGHT,
  LENGTH_UNIT,
  WEIGHT_UNIT,
} = FORM_FIELDS;

const widthValidation = optionalPositiveIntValidation;
const heightValidation = optionalPositiveIntValidation;
const depthValidation = optionalPositiveIntValidation;
const weightValidation = optionalPositiveIntValidation;

export const publicationTypeValidationSchema = z.object({ [PUBLICATION_TYPE.name]: publicationTypeValidation });

export const isbnValidationSchema = z.object({ [PUBLICATION_ISBN.name]: isbnValidation });

export const dimensionsValidationSchema = z.object({
  [PUBLICATION_WIDTH.name]: widthValidation,
  [PUBLICATION_HEIGHT.name]: heightValidation,
  [PUBLICATION_DEPTH.name]: depthValidation,
  [PUBLICATION_WEIGHT.name]: weightValidation,
  [LENGTH_UNIT.name]: lengthUnitValidation,
  [WEIGHT_UNIT.name]: weightUnitValidation,
});
