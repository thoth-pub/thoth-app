import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { getRequiredStringValidation } from '@/src/shared/utils/validations';

const { IMPRINT } = FORM_FIELDS;

export const imprintValidationSchema = z.object({
  [IMPRINT.name]: getRequiredStringValidation(),
});
