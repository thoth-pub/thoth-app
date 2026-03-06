import { CurrencyCode, LocaleCode } from '@/gql/graphql';

import { appConfig } from '../../config';
import { currencyOptions, languageOptionsAlt } from '../../constants';

const { publisherDefaultValues } = appConfig;

export const findCurrencyOption = (value?: CurrencyCode | string) => {
  const currencyOption = currencyOptions.find((o) => o.value === value);

  if (currencyOption) {
    return currencyOption;
  }

  const configDefaultCurrency = currencyOptions.find((o) => o.value === publisherDefaultValues.defaultCurrency);

  return configDefaultCurrency ?? currencyOptions[0];
};

export const findLocaleOption = (value?: LocaleCode | string) => {
  const localeOption = languageOptionsAlt.find((o) => o.value === value);

  if (localeOption) {
    return localeOption;
  }

  const configDefaultLocale = languageOptionsAlt.find((o) => o.value === publisherDefaultValues.defaultLocale);

  return configDefaultLocale ?? languageOptionsAlt[0];
};
