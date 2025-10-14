import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { getRequiredStringValidation } from '@/src/shared/utils/validations';

const { INSTITUTION } = FORM_FIELDS;

export const institutionValidationSchema = z.object({
  [INSTITUTION.name]: z.object({
    value: getRequiredStringValidation(),
    label: getRequiredStringValidation(),
  }),
});
