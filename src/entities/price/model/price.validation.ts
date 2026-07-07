import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import {
  currencyCodeValidation,
  getRequiredStringValidation,
  positiveIntValidation,
} from '@/src/shared/utils/validations';

const { PRICES, CURRENCY, VALUE } = FORM_FIELDS;

const priceValueValidationSchema = positiveIntValidation;

const currencyCodeValidationSchema = z.object({
  value: currencyCodeValidation,
  label: getRequiredStringValidation(),
});

export const pricesValidationSchema = z.object({
  [PRICES.name]: z
    .array(
      z.object({
        priceId: getRequiredStringValidation(),
        [CURRENCY.name]: currencyCodeValidationSchema,
        [VALUE.name]: priceValueValidationSchema,
      }),
    )
    .superRefine((prices, ctx) => {
      const seenCurrencies = new Set<string>();

      prices.forEach((price, index) => {
        const currency = price[CURRENCY.name].value;

        if (seenCurrencies.has(currency)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Duplicate currency',
            path: [index, CURRENCY.name],
          });
        }

        seenCurrencies.add(currency);
      });
    }),
});
