import z from 'zod';

import { LengthUnit as GQLLengthUnit, WeightUnit as GQLWeightUnit } from '@/gql/graphql';

export const LengthUnit = z.enum(GQLLengthUnit);

export const WeightUnit = z.enum(GQLWeightUnit);
