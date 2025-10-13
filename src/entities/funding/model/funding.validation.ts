import z from 'zod';

import { optionalStringValidation, uuidValidation } from '@/src/shared/utils/validations';

export const fundingValidationSchema = z.object({
  institutionId: uuidValidation,
  grantNumber: optionalStringValidation,
  jurisdiction: optionalStringValidation,
  program: optionalStringValidation,
  projectName: optionalStringValidation,
  projectShortname: optionalStringValidation,
});
