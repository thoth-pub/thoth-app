import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';

const { ENDORSEMENT_URL, ENDORSEMENT_AUTHOR_NAME, ENDORSEMENT_AUTHOR_ROLE, ENDORSEMENT_AUTHOR_INSTITUTION, ENDORSEMENT_TEXT } = FORM_FIELDS;

export const endorsementUrlValidationSchema = z.object({
  [ENDORSEMENT_URL.name]: optionalUrlValidation,
});

export const endorsementAuthorNameValidationSchema = z.object({
  [ENDORSEMENT_AUTHOR_NAME.name]: optionalStringValidation,
});

export const endorsementAuthorRoleValidationSchema = z.object({
  [ENDORSEMENT_AUTHOR_ROLE.name]: optionalStringValidation,
});

export const endorsementAuthorInstitutionValidationSchema = z.object({
  [ENDORSEMENT_AUTHOR_INSTITUTION.name]: z.object({
    value: z.string(),
    label: z.string(),
  }),
});

export const endorsementTextValidationSchema = z.object({
  [ENDORSEMENT_TEXT.name]: optionalStringValidation,
});
