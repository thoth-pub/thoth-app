import z from 'zod';

import { CountryCode as GQLCountryCode } from '@/gql/graphql';

export const CountryCode = z.enum(GQLCountryCode);
