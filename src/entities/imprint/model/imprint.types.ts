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
  | 's3Bucket'
  | 'cdnDomain'
  | 'cloudfrontDistId'
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
  s3Bucket: string;
  cdnDomain: string;
  cloudfrontDistId: string;
};

export type ImprintForm = z.infer<typeof imprintValidationSchema>;
