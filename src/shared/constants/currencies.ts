import z from 'zod';

import { CurrencyCode as GQLCurrencyCode } from '@/gql/graphql';

export const CurrencyCode = z.enum(GQLCurrencyCode);
