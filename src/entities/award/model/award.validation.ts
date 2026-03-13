import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { getRequiredStringValidation, optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';

const { AWARD_URL, AWARD_TITLE, AWARD_CATEGORY, AWARD_NOTE } = FORM_FIELDS;

export const awardUrlValidationSchema = z.object({
  [AWARD_URL.name]: optionalUrlValidation,
});

export const awardTitleValidationSchema = z.object({
  [AWARD_TITLE.name]: getRequiredStringValidation(),
});

export const awardCategoryValidationSchema = z.object({
  [AWARD_CATEGORY.name]: optionalStringValidation,
});

export const awardNoteValidationSchema = z.object({
  [AWARD_NOTE.name]: optionalStringValidation,
});
