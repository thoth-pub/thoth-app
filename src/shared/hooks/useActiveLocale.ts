'use client';

import { useTranslation } from 'react-i18next';

const useActiveLocale = () => {
  const { i18n } = useTranslation();

  return i18n.language;
};

export default useActiveLocale;
