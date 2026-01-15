import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  getRequiredStringValidation,
  languageValidation,
  optionalStringValidation,
} from '@/src/shared/utils/validations';

const { WORK_TITLE, MARKDOWN_FORMAT, SUBTITLE, LANGUAGE, TITLES, TITLE, IMPRINT } = FORM_FIELDS;

const titleLanguageValidation = z.object({
  value: languageValidation,
  label: getRequiredStringValidation(),
});

export const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
export const imprintValidation = getRequiredStringValidation(IMPRINT.errorMessage);

export const setTitleValidationSchema = z.object({
  [TITLES.name]: z
    .array(
      z.object({
        titleId: getRequiredStringValidation(),
        [WORK_TITLE.name]: titleValidation,
        [SUBTITLE.name]: optionalStringValidation,
        [LANGUAGE.name]: titleLanguageValidation,
      }),
    )
    .min(1),
  [MARKDOWN_FORMAT.name]: z.boolean().optional(),
});

export const setImprintValidationSchema = z.object({
  [IMPRINT.name]: imprintValidation,
});
