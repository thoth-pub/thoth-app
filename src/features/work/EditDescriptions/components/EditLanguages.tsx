import { LanguagesForm } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { type BaseRecommendedSectionProps } from '@/src/shared';

import { useEditLanguages } from './useEditLanguages';

type EditLanguagesProps = BaseRecommendedSectionProps & {
  onUpdate?: (data: LanguagesFormType) => void;
  onDelete?: (id: string) => void;
};

export const EditLanguages = (props: EditLanguagesProps) => {
  const { workId, recommended = false, onUpdate, onDelete } = props;

  const { languages, showIndicator, update, deleteLanguage, close } = useEditLanguages({
    workId,
    recommended,
    onUpdate,
    onDelete,
  });

  return (
    <LanguagesForm
      languages={languages}
      showRecommendations={showIndicator}
      onUpdate={update}
      onDelete={deleteLanguage}
      onClose={close}
    />
  );
};
