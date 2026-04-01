import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { getRequiredStringValidation, languageRelationValidation } from '@/src/shared/utils';

const { LANGUAGE_RELATION, LANGUAGE, LANGUAGES } = FORM_FIELDS;

const languageValidationSchema = z.object({
  value: getRequiredStringValidation(),
  label: getRequiredStringValidation(),
});

export const languagesValidationSchema = z.object({
  [LANGUAGES.name]: z.array(
    z.object({
      languageId: getRequiredStringValidation(),
      [LANGUAGE.name]: languageValidationSchema,
      [LANGUAGE_RELATION.name]: languageRelationValidation,
    }),
  ),
});
