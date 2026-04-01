import z from 'zod';

import { emailValidation, getRequiredStringValidation } from '@/src/shared/utils/validations';

export const authValidationSchema = z.object({
  email: emailValidation,
  password: getRequiredStringValidation(),
});
