import z from 'zod';

import { LanguageCode as GQLLanguageType } from '@/gql/graphql';

export const LanguageType = z.enum(GQLLanguageType);
