'use client';

import { useTypedTranslation } from '@/src/shared/hooks';
import { Namespace, NAMESPACES } from '@/src/shared/i18n/model/i18n.types';

type TranslatedContentProps = {
  content: string;
  namespace?: Namespace;
};

const TranslatedContent = ({ namespace = NAMESPACES.enum.common, content }: TranslatedContentProps) => {
  const { t } = useTypedTranslation({ namespace });

  return <>{t(content)}</>;
};

export default TranslatedContent;
