import type { ImprintId } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { findLocaleOption } from '@/src/shared/utils';

/** The imprint's default locale from the settled identity; undefined until identity has settled. */
const useDefaultLocaleOption = (imprintId: ImprintId) => {
  const { identitySettled, settledImprints } = useUser();

  if (!identitySettled) return undefined;

  const imprint = settledImprints.find((imprint) => imprint.id === imprintId);

  const locale = imprint?.defaultLocale ?? appConfig.publisherDefaultValues.defaultLocale;

  const localeOption = findLocaleOption(locale);

  return localeOption;
};

export default useDefaultLocaleOption;
