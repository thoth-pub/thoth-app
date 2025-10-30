'use client';

import { useTranslation } from 'react-i18next';

import { getWorkTypeOptions } from '../utils';

const useWorkTypeOptions = () => {
  const { i18n } = useTranslation();

  const workTypeOptions = getWorkTypeOptions(i18n.language);

  return workTypeOptions;
};

export default useWorkTypeOptions;
