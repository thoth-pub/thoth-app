import z from 'zod';

import type { CurrencyCode, Imprint, LocaleCode, Publisher } from '@/gql/graphql';

import { imprintValidationSchema } from './imprint.validation';

export type ImprintDto = Pick<
  Imprint,
  | 'imprintId'
  | 'imprintName'
  | 'imprintUrl'
  | 'updatedAt'
  | 'crossmarkDoi'
  | 'defaultCurrency'
  | 'defaultLocale'
  | 'defaultPlace'
> & {
  publisher: Pick<Publisher, 'publisherName'>;
};

export type ImprintId = string;

export type ImprintEntity = {
  id: ImprintId;
  name: string;
  url: string;
  updatedAt: string;
  publisherName: string;
  crossmarkDoi: string;
  defaultCurrency: CurrencyCode;
  defaultLocale: LocaleCode;
  defaultPlace: string;
};

export type ImprintForm = z.infer<typeof imprintValidationSchema>;
