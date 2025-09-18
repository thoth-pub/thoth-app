import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { contributorType, getRequiredStringValidation, optionalStringValidation } from '@/src/shared/utils/validations';

const { CONTRIBUTOR_FULLNAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY } = FORM_FIELDS;

export const contributorFullNameValidationSchema = z.object({
  [CONTRIBUTOR_FULLNAME.name]: getRequiredStringValidation(),
});

export const contributorTypeValidationSchema = z.object({ [CONTRIBUTOR_TYPE.name]: contributorType });

export const contributorBiography = z.object({ [CONTRIBUTOR_BIOGRAPHY.name]: optionalStringValidation });

export type ContributorFullNameForm = z.infer<typeof contributorFullNameValidationSchema>;

export type ContributorTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributorBiographyForm = z.infer<typeof contributorBiography>;
