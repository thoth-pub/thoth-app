'use client';

import type { LanguageCode } from '@/gql/graphql';
import { useLanguage } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { useWork } from '@/src/entities/work';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { isDefaultId } from '@/src/shared/utils';

type useEditLanguagesProps = BaseRecommendedSectionProps & {
  onUpdate?: (data: LanguagesFormType) => void;
  onDelete?: (id: string) => void;
};

export const useEditLanguages = (props: useEditLanguagesProps) => {
  const { workId, recommended, onUpdate, onDelete } = props;

  const { work } = useWork(workId);
  const { closeForm } = useFormStateMachine();
  const { createLanguage, updateLanguage, deleteLanguage: deleteLanguageMutation } = useLanguage({ workId });

  const showIndicator = recommended && work.languages.length === 0;

  const update = (data: LanguagesFormType) => {
    if (onUpdate) {
      onUpdate(data);
      return;
    }

    const newLanguages: LanguagesFormType['languages'] = [];
    const existingLanguages: LanguagesFormType['languages'] = [];

    data.languages.forEach((item) => {
      const existItem = work.languages.find((workItem) => workItem.code === item.language.value);

      if (existItem) {
        existingLanguages.push({ ...item, languageId: existItem.id });
        return;
      }

      newLanguages.push(item);
    });

    const newCodes: LanguageCode[] = [];

    newLanguages.forEach(({ language: { value }, languageRelation }) => {
      newCodes.push(value as LanguageCode);
      createLanguage({
        id: '',
        code: value as LanguageCode,
        relation: languageRelation,
        isMain: true,
      });
    });

    existingLanguages.forEach(({ languageId, language: { value }, languageRelation }) => {
      newCodes.push(value as LanguageCode);

      updateLanguage({
        id: languageId,
        code: value as LanguageCode,
        relation: languageRelation,
        isMain: true,
      });
    });

    work.languages.forEach((language) => {
      if (newCodes.includes(language.code)) return;

      deleteLanguageMutation(language.id);
    });
  };

  const deleteLanguage = (id: string) => {
    if (isDefaultId(id)) return;

    if (onDelete) {
      onDelete(id);
      return;
    }

    const item = work.languages.find((item) => item.id === id);

    if (!item) return;

    deleteLanguageMutation(id);
  };

  return {
    showIndicator,
    languages: work.languages ?? [],
    update,
    deleteLanguage,
    closeForm,
  };
};
