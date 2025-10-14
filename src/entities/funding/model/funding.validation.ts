import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { optionalStringValidation } from '@/src/shared/utils/validations';

const { PROJECT_NAME, PROJECT_SHORTNAME, JURISDICTION, PROGRAM, GRANT_NUMBER } = FORM_FIELDS;

export const projectNameValidationSchema = z.object({
  [PROJECT_NAME.name]: optionalStringValidation,
});

export const projectShortNameValidationSchema = z.object({
  [PROJECT_SHORTNAME.name]: optionalStringValidation,
});

export const jurisdictionValidationSchema = z.object({
  [JURISDICTION.name]: optionalStringValidation,
});

export const programValidationSchema = z.object({
  [PROGRAM.name]: optionalStringValidation,
});

export const grantNumberValidationSchema = z.object({
  [GRANT_NUMBER.name]: optionalStringValidation,
});

export const fundingValidationSchema = z.object({
  grantNumber: optionalStringValidation,
  jurisdiction: optionalStringValidation,
  program: optionalStringValidation,
  projectName: optionalStringValidation,
  projectShortname: optionalStringValidation,
});
