import z from 'zod';

import { LengthUnit as GQLLengthUnit } from '@/gql/graphql';

export const LengthUnit = z.enum(GQLLengthUnit);
