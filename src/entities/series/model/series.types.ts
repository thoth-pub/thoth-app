import z from 'zod';

import type { Series } from '@/gql/graphql';
import { SeriesType as SeriesTypeEnum } from '@/src/shared/constants';

import { seriesValidationSchema } from './series.validation';

export type SeriesDto = Pick<
  Series,
  | 'seriesId'
  | 'seriesName'
  | 'seriesType'
  | 'issnPrint'
  | 'issnDigital'
  | 'updatedAt'
  | 'imprintId'
  | 'seriesDescription'
  | 'seriesUrl'
> & {
  imprint: {
    imprintName: string;
  };
};

export type SeriesType = z.infer<typeof SeriesTypeEnum>;

export type SeriesEntity = {
  id: string;
  name: string;
  type: SeriesType;
  issnPrint: string;
  issnDigital: string;
  updatedAt: string;
  imprintId: string;
  imprintName: string;
  url: string;
  description: string;
};

export type SeriesForm = z.infer<typeof seriesValidationSchema>;
