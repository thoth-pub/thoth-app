import z from 'zod';

import type { LanguageCode, LanguageFragmentFragment, LanguageRelation } from '@/gql/graphql';

import { languagesValidationSchema } from './language.validation';

export type LanguageDto = LanguageFragmentFragment;

export type LanguagesForm = z.infer<typeof languagesValidationSchema>;

export type LanguageEntity = {
  code: LanguageCode;
  relation: LanguageRelation;
  id: string;
};
