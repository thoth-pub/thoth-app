import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';
import { doiValidation } from '@/src/shared/utils/validations';

const { REFERENCE_URL, DOI, REFERENCE_CITATION } = FORM_FIELDS;

export const referenceValidationSchema = z.object({
  [REFERENCE_URL.name]: optionalUrlValidation,
});

export const doiValidationSchema = z.object({
  [DOI.name]: doiValidation,
});

export const referenceCitationValidationSchema = z.object({
  [REFERENCE_CITATION.name]: optionalStringValidation,
});
