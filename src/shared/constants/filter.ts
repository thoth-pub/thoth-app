import z from 'zod';

import { Direction, SeriesField, WorkField } from '@/gql/graphql';

export const FILTER_DIRECTION_OPTIONS = z.enum(Direction);

export const FILTER_WORK_ORDER_BY_OPTIONS = z.enum([
  WorkField.UpdatedAtWithRelations,
  WorkField.CreatedAt,
  WorkField.PublicationDate,
]);

export const FILTER_SERIES_ORDER_BY_OPTIONS = z.enum([SeriesField.UpdatedAt, SeriesField.CreatedAt]);
