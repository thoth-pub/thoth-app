import z from 'zod';

import type { Series } from '@/gql/graphql';
import { SeriesType as SeriesTypeEnum } from '@/src/shared/constants';

import {
  issueValidationSchema,
  seriesDescriptionValidation,
  seriesImprintValidation,
  seriesIssnValidation,
  seriesNameValidation,
  seriesTypeValidationSchema,
  seriesUrlValidation,
} from './series.validation';

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
    seriesId: SeriesId;
  }[];
};

export type IssueValidationSchema = z.infer<typeof issueValidationSchema>;

export type SeriesTypeFormType = z.infer<typeof seriesTypeValidationSchema>;

export type SeriesNameFormType = z.infer<typeof seriesNameValidation>;

export type SeriesIssnFormType = z.infer<typeof seriesIssnValidation>;

export type SeriesUrlFormType = z.infer<typeof seriesUrlValidation>;

export type SeriesDescriptionFormType = z.infer<typeof seriesDescriptionValidation>;

export type SeriesImprintFormType = z.infer<typeof seriesImprintValidation>;
