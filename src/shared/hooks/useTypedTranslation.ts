'use client';

import { TOptions } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Namespace, RESOURCES } from '../i18n/model/i18n.types';

const useTypedTranslation = ({ namespace }: { namespace: Namespace }) => {
  const { t } = useTranslation(namespace);

  return { t: t as (key: keyof typeof RESOURCES.enum, options?: TOptions) => string };
};

export default useTypedTranslation;
