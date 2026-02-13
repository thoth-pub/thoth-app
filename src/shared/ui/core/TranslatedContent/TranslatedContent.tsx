'use client';

import { TOptions } from 'i18next';

import { useTypedTranslation } from '@/src/shared/hooks';
import { Namespace, NAMESPACES } from '@/src/shared/i18n/model/i18n.types';

type TranslatedContentProps = {
  content: string;
  namespace?: Namespace;
  options?: TOptions;
};

const TranslatedContent = ({ namespace = NAMESPACES.enum.common, content, options }: TranslatedContentProps) => {
  const { t } = useTypedTranslation({ namespace });

  return <>{t(content, options)}</>;
};

export default TranslatedContent;
