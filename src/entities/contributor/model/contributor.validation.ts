import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  contributorType,
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
  orcidValidation,
} from '@/src/shared/utils/validations';

const { CONTRIBUTOR_FULLNAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY, FIRST_NAME, LAST_NAME, ORCID, WEBSITE_URL } =
  FORM_FIELDS;

export const contributorFullNameValidationSchema = z.object({
  [CONTRIBUTOR_FULLNAME.name]: getRequiredStringValidation(),
});

export const contributorTypeValidationSchema = z.object({ [CONTRIBUTOR_TYPE.name]: contributorType });

export const contributorBiography = z.object({ [CONTRIBUTOR_BIOGRAPHY.name]: optionalStringValidation });

export type ContributorFullNameForm = z.infer<typeof contributorFullNameValidationSchema>;

export type ContributorTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributorBiographyForm = z.infer<typeof contributorBiography>;

export const contributorFormValidationSchema = z.object({
  [FIRST_NAME.name]: optionalStringValidation,
  [LAST_NAME.name]: getRequiredStringValidation(),
  [ORCID.name]: orcidValidation,
  [WEBSITE_URL.name]: optionalUrlValidation,
});

export type ContributorForm = z.infer<typeof contributorFormValidationSchema>;
