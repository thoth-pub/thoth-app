import z from 'zod';

import { SeriesType as GQLSeriesType } from '@/gql/graphql';

export const SeriesType = z.enum(GQLSeriesType);
