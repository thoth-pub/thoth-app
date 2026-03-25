import z from 'zod';

import type { CurrencyCode, Imprint, LocaleCode, Publisher } from '@/gql/graphql';

import { imprintValidationSchema } from './imprint.validation';

export type ImprintBaseDto = Pick<
  Imprint,
  'imprintId' | 'imprintName' | 'imprintUrl' | 'updatedAt' | 'crossmarkDoi' | 'defaultCurrency' | 'defaultLocale' | 'defaultPlace'
> & {
  publisher: Pick<Publisher, 'publisherName'>;
};

export type ImprintDto = ImprintBaseDto & Pick<Imprint, 's3Bucket' | 'cdnDomain' | 'cloudfrontDistId'>;

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
