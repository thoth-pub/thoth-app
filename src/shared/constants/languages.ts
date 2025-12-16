import z from 'zod';

import {
  LanguageCode as GQLLanguageType,
  LanguageRelation as GQLLanguageRelation,
  LocaleCode as GQLLocaleCode,
} from '@/gql/graphql';

export const LanguageType = z.enum(GQLLanguageType);

export const LanguageRelation = z.enum(GQLLanguageRelation);

export const LanguageTypeAlt = z.enum(GQLLocaleCode);
