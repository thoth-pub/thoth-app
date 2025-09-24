import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  contributorType,
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
  orcidValidation,
} from '@/src/shared/utils/validations';

const {
  CONTRIBUTOR_FULLNAME,
  CONTRIBUTOR_TYPE,
  FULL_NAME,
  CONTRIBUTOR_BIOGRAPHY,
  FIRST_NAME,
  LAST_NAME,
  ORCID,
  WEBSITE_URL,
  AFFILIATIONS,
  AFFILIATION,
  POSITION,
} = FORM_FIELDS;

export const contributorFullNameValidationSchema = z.object({
  [CONTRIBUTOR_FULLNAME.name]: getRequiredStringValidation(),
});

export const contributorLastNameValidationSchema = z.object({
  [LAST_NAME.name]: getRequiredStringValidation(),
});

export const orcidValidationSchema = z.object({
  [ORCID.name]: orcidValidation,
});

export const websiteUrlValidationSchema = z.object({
  [WEBSITE_URL.name]: optionalUrlValidation,
});

export const contributorBiographyValidationSchema = z.object({
  [CONTRIBUTOR_BIOGRAPHY.name]: optionalStringValidation,
});

export const contributorTypeValidationSchema = z.object({ [CONTRIBUTOR_TYPE.name]: contributorType });

export const contributorFormValidationSchema = z.object({
  [FIRST_NAME.name]: optionalStringValidation,
  [LAST_NAME.name]: getRequiredStringValidation(),
  [FULL_NAME.name]: getRequiredStringValidation(),
  [ORCID.name]: orcidValidation,
  [WEBSITE_URL.name]: optionalUrlValidation,
});

const affiliationValidationSchema = z.object({
  value: getRequiredStringValidation(),
  label: getRequiredStringValidation(),
});

const positionValidationSchema = getRequiredStringValidation();

export const affiliationsValidationSchema = z.object({
  [AFFILIATIONS.name]: z.array(
    z.object({
      id: getRequiredStringValidation(),
      [AFFILIATION.name]: affiliationValidationSchema,
      [POSITION.name]: positionValidationSchema,
    }),
  ),
});

export type ContributorFullNameForm = z.infer<typeof contributorFullNameValidationSchema>;

export type ContributorLastNameForm = z.infer<typeof contributorLastNameValidationSchema>;

export type OrcidForm = z.infer<typeof orcidValidationSchema>;

export type WebsiteUrlForm = z.infer<typeof websiteUrlValidationSchema>;

export type ContributorTypeForm = z.infer<typeof contributorTypeValidationSchema>;

export type ContributorBiographyForm = z.infer<typeof contributorBiographyValidationSchema>;

export type ContributorForm = z.infer<typeof contributorFormValidationSchema>;

export type AffiliationsForm = z.infer<typeof affiliationsValidationSchema>;
