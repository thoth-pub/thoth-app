import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { contributorType, getRequiredStringValidation, optionalStringValidation } from '@/src/shared/utils/validations';

const { FULL_NAME, FIRST_NAME, LAST_NAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY } = FORM_FIELDS;

const fullNameValidation = getRequiredStringValidation();

const lastNameValidation = getRequiredStringValidation();

const firstNameValidation = optionalStringValidation;

const biographyValidation = optionalStringValidation;

export const namesFormValidationSchema = z.object({
  [FIRST_NAME.name]: firstNameValidation,
  [LAST_NAME.name]: lastNameValidation,
  [FULL_NAME.name]: fullNameValidation,
});

export const contributorTypeValidationSchema = z.object({ [CONTRIBUTOR_TYPE.name]: contributorType });

export const contributorBiographyValidationSchema = z.object({
  [CONTRIBUTOR_BIOGRAPHY.name]: biographyValidation,
});
