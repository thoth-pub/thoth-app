import z from 'zod';

import type { Imprint, Publisher } from '@/gql/graphql';

import { imprintValidationSchema } from './imprint.validation';

export type ImprintDto = Pick<Imprint, 'imprintId' | 'imprintName' | 'imprintUrl' | 'updatedAt'> & {
  publisher: Pick<Publisher, 'publisherName'>;
};

export type ImprintId = string;

export type ImprintEntity = {
  id: ImprintId;
  name: string;
  url: string;
  updatedAt: string;
  publisherName: string;
};

export type ImprintForm = z.infer<typeof imprintValidationSchema>;
