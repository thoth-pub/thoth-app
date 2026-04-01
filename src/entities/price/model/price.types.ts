import z from 'zod';

import type { Price } from '@/gql/graphql';
import { CurrencyCode } from '@/src/shared/constants';

import { pricesValidationSchema } from './price.validation';

export type PriceDto = Pick<Price, 'priceId' | 'currencyCode' | 'unitPrice'>;

export type PriceId = string;

export type PriceEntity = {
  id: PriceId;
  currencyCode: CurrencyCode;
  unitPrice: number;
};

export type CurrencyCode = z.infer<typeof CurrencyCode>;

export type PricesForm = z.infer<typeof pricesValidationSchema>;
