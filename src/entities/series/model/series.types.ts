import z from 'zod';

import type { Issue, Series } from '@/gql/graphql';
import { SeriesType as SeriesTypeEnum } from '@/src/shared/constants';

import { issueValidationSchema, seriesValidationSchema } from './series.validation';

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
  issues: { issueId: string; issueOrdinal: number; work: { workId: string; title: string } }[];
};

export type SeriesType = z.infer<typeof SeriesTypeEnum>;

export type SeriesId = string;

export type SeriesEntity = {
  id: SeriesId;
  name: string;
  type: SeriesType;
  issnPrint: string;
  issnDigital: string;
  updatedAt: string;
  imprintId: string;
  imprintName: string;
  url: string;
  description: string;
  issues: {
    id: string;
    ordinal: number;
    workId: string;
    title: string;
  }[];
};

export type SeriesForm = z.infer<typeof seriesValidationSchema>;

export type IssueValidationSchema = z.infer<typeof issueValidationSchema>;
