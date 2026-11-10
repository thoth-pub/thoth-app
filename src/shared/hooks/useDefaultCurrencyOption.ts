import { CurrencyCode } from '@/gql/graphql';
import type { ImprintId } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { findCurrencyOption } from '@/src/shared/utils';

/** The imprint's default currency from the settled identity; undefined until identity has settled. */
const useDefaultCurrencyOption = (imprintId: ImprintId) => {
  const { identitySettled, settledImprints } = useUser();

  if (!identitySettled) return undefined;

  const imprint = settledImprints.find((imprint) => imprint.id === imprintId);

  const curency = imprint?.defaultCurrency ?? appConfig.publisherDefaultValues.defaultCurrency;

  const currencyOption = findCurrencyOption(curency);

  return currencyOption as { value: CurrencyCode; label: string };
};

export default useDefaultCurrencyOption;
