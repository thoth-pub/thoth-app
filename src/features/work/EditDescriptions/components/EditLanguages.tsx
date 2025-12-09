import { LanguagesForm } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { type BaseRecommendedSectionProps } from '@/src/shared';

import { useEditLanguages } from './useEditLanguages';

type EditLanguagesProps = BaseRecommendedSectionProps & {
  onUpdate?: (data: LanguagesFormType) => void;
  onDelete?: (id: string) => void;
  onSelectAsMain?: (id: string) => void;
};

export const EditLanguages = (props: EditLanguagesProps) => {
  const { workId, queryToken, recommended = false, onUpdate, onDelete, onSelectAsMain } = props;

  const { languages, showIndicator, update, deleteLanguage, selectAsMain, close } = useEditLanguages({
    workId,
    queryToken,
    recommended,
    onUpdate,
    onDelete,
    onSelectAsMain,
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
