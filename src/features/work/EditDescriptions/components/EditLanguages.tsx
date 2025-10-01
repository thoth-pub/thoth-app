import { useMemo } from 'react';

import { LanguageRelation } from '@/gql/graphql';
import { LanguagesForm, useLanguage } from '@/src/entities/language';
import { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import { useWork } from '@/src/entities/work';
import { type BaseRecommendedSectionProps, isDefaultId } from '@/src/shared';
import { FORM_FIELDS, languageOptions } from '@/src/shared/constants/formFields';

const { LANGUAGE, LANGUAGE_RELATION } = FORM_FIELDS;

// TODO move to hook add mappers
export const EditLanguages = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { work } = useWork(workId, queryToken);
  const { createLanguage, updateLanguage, deleteLanguage } = useLanguage({ queryToken, workId });

  const { languages = [] } = work;

  const defaultValues = useMemo(
    () =>
      languages
        .map(({ code, relation, id, isMain }) => {
          const languageOption = languageOptions.find((option) => option.value.toLowerCase() === code.toLowerCase());

          if (!languageOption) return null;

          return {
            languageId: id,
            isMain,
            [LANGUAGE.name]: languageOption,
            [LANGUAGE_RELATION.name]: relation as LanguageRelation,
          };
        })
        .filter((item) => !!item),
    [languages],
  );

  const showIndicator = recommended && defaultValues.length === 0;

  const onUpdate = (data: LanguagesFormType) => {
    const newLanguages = [...data.languages].filter(({ languageId }) => isDefaultId(languageId));
    const existingLanguages = [...data.languages].filter(({ languageId }) => !isDefaultId(languageId));

    newLanguages.forEach(({ language: { value }, languageRelation }) => {
      createLanguage({
        variables: { data: { languageCode: value, languageRelation, mainLanguage: false, workId } },
      });
    });

    existingLanguages.forEach(({ languageId, language: { value }, languageRelation, isMain }) => {
      updateLanguage({
        variables: { data: { languageId, languageCode: value, languageRelation, mainLanguage: isMain, workId } },
      });
    });
  };

  const onDelete = (id: string) => {
    if (isDefaultId(id)) return;

    const item = defaultValues.find((item) => item.languageId === id);

    if (!item) return;

    deleteLanguage({
      variables: { languageId: item.languageId },
    });
  };

  const onSelectAsMain = (id: string) => {
    const item = defaultValues.find((item) => item.languageId === id);

    if (!item) return;

    updateLanguage({
      variables: {
        data: {
          languageId: id,
          languageCode: item.language.value,
          languageRelation: item.languageRelation,
          mainLanguage: !item.isMain,
          workId,
        },
      },
    });
  };

  return (
    <LanguagesForm
      defaultValues={defaultValues}
      showRecommendations={showIndicator}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onSelectAsMain={onSelectAsMain}
    />
  );
};
