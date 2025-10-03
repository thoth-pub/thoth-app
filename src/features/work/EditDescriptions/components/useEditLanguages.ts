'use client';

import type { LanguageCode } from '@/gql/graphql';
import { useLanguage } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { useWork } from '@/src/entities/work';
import { type BaseRecommendedSectionProps, isDefaultId } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

type useEditLanguagesProps = BaseRecommendedSectionProps;

export const useEditLanguages = (props: useEditLanguagesProps) => {
  const { workId, queryToken, recommended } = props;

  const { work } = useWork(workId, queryToken);
  const { close } = useFormStateMachine();
  const {
    createLanguage,
    updateLanguage,
    deleteLanguage: deleteLanguageMutation,
  } = useLanguage({ queryToken, workId });

  const showIndicator = recommended && work.languages.length === 0;

  const update = (data: LanguagesFormType) => {
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

    console.log('newLanguages', newLanguages);
    console.log('existingLanguages', existingLanguages);

    const newCodes: LanguageCode[] = [];

    newLanguages.forEach(({ language: { value }, languageRelation }) => {
      newCodes.push(value as LanguageCode);
      createLanguage({
        code: value as LanguageCode,
        relation: languageRelation,
        isMain: false,
      });
    });

    existingLanguages.forEach(({ languageId, language: { value }, languageRelation, isMain }) => {
      newCodes.push(value as LanguageCode);

      updateLanguage({
        id: languageId,
        code: value as LanguageCode,
        relation: languageRelation,
        isMain,
      });
    });

    work.languages.forEach((language) => {
      if (newCodes.includes(language.code)) return;

      deleteLanguageMutation(language.id);
    });
  };

  const deleteLanguage = (id: string) => {
    if (isDefaultId(id)) return;

    const item = work.languages.find((item) => item.id === id);

    if (!item) return;

    deleteLanguageMutation(id);
  };

  const selectAsMain = async (id: string) => {
    const item = work.languages.find((item) => item.id === id);

    if (!item) return;

    updateLanguage({
      id: id,
      code: item.code,
      relation: item.relation,
      isMain: !item.isMain,
    });
  };

  return {
    showIndicator,
    languages: work.languages ?? [],
    update,
    deleteLanguage,
    selectAsMain,
    close,
  };
};
