import z from 'zod';

import { AwardRoles, FORM_FIELDS } from '@/src/shared/constants';
import { getRequiredStringValidation, optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';

const { AWARD_URL, AWARD_TITLE, AWARD_CATEGORY, AWARD_STATEMENT, AWARD_ROLE } = FORM_FIELDS;

export const awardUrlValidationSchema = z.object({
  [AWARD_URL.name]: optionalUrlValidation,
});

export const awardTitleValidationSchema = z.object({
  [AWARD_TITLE.name]: getRequiredStringValidation(),
});

export const awardCategoryValidationSchema = z.object({
  [AWARD_CATEGORY.name]: optionalStringValidation,
});

export const awardStatementValidationSchema = z.object({
  [AWARD_STATEMENT.name]: optionalStringValidation,
});

export const awardRoleValidationSchema = z.object({
  [AWARD_ROLE.name]: AwardRoles.nullable(),
});
