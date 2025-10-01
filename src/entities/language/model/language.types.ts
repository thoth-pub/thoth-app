import z from 'zod';

import { languagesValidationSchema } from './language.validation';

export type LanguagesForm = z.infer<typeof languagesValidationSchema>;

export type LanguageEntity = {
  code: string;
  relation: string;
  isMain: boolean;
  id: string;
};
