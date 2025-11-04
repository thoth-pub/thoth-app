import { LanguagesForm } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { type BaseRecommendedSectionProps } from '@/src/shared';

import { useEditLanguages } from './useEditLanguages';

type EditLanguagesProps = BaseRecommendedSectionProps & {
  onUpdate?: (data: LanguagesFormType) => void;
};

export const EditLanguages = (props: EditLanguagesProps) => {
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
