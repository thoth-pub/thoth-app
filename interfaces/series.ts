import type { Series } from '@/gql/graphql';

export type SeriesDto = Pick<
  Series,
  'seriesId' | 'seriesName' | 'seriesType' | 'issnPrint' | 'issnDigital' | 'updatedAt'
>;

export type SeriesEntity = {
  id: string;
  name: string;
  type: string;
  issnPrint: string;
  issnDigital: string;
  updatedAt: string;
};
