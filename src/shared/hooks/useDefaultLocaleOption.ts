import type { ImprintId } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { findLocaleOption } from '@/src/shared/utils';

const useDefaultLocaleOption = (imprintId: ImprintId) => {
  const { userImprints } = useUser();

  const imprint = userImprints.find((imprint) => imprint.id === imprintId);

  const locale = imprint?.defaultLocale ?? appConfig.publisherDefaultValues.defaultLocale;

  const localeOption = findLocaleOption(locale);

  return localeOption;
};

export default useDefaultLocaleOption;
