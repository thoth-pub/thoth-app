import { LanguagesForm } from '@/src/entities/language';
import { type BaseRecommendedSectionProps } from '@/src/shared';

import { useEditLanguages } from './useEditLanguages';

export const EditLanguages = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { languages, showIndicator, update, deleteLanguage, selectAsMain, close } = useEditLanguages({
    workId,
    queryToken,
    recommended,
  });

  return (
    <LanguagesForm
      languages={languages}
      showRecommendations={showIndicator}
      onUpdate={update}
      onDelete={deleteLanguage}
      onSelectAsMain={selectAsMain}
      onClose={close}
    />
  );
};
