'use client';

import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { FormAnimationWrapper } from '@/src/shared/ui';
import AddButton from '@/src/shared/ui/core/AddButton/AddButton';

import type { WorkTitlesForm } from '../../../model/work.types';
import { FieldsGroup } from './FieldsGroup';

const { TITLE, SUBTITLE } = FORM_FIELDS;

type FormProps = {
  fields: WorkTitlesForm['titles'];
  control: Control<WorkTitlesForm>;
  isValid: boolean;
  isMarkdownMode: boolean;
  switchFormMode: () => void;
  getTitleFieldName: (fieldIndex: number) => string;
  getSubtitleFieldName: (fieldIndex: number) => string;
  getLanguageFieldName: (fieldIndex: number) => string;
  selectLanguageAsMain: (fieldIndex: number) => void;
  deleteLanguage: (fieldIndex: number) => void;
  addLanguage: () => void;
  onSubmit: () => void;
};

export const Form = (props: FormProps) => {
  const {
    fields,
    control,
    isValid,
    isMarkdownMode,
    switchFormMode,
    getTitleFieldName,
    getSubtitleFieldName,
    getLanguageFieldName,
    selectLanguageAsMain,
    deleteLanguage,
    addLanguage,
    onSubmit,
  } = props;

  const { t } = useTranslation();

  return (
    <FormAnimationWrapper key="edit-mode">
      <form className="flex flex-col gap-[var(--default-gap)]" onSubmit={onSubmit}>
        {fields.map((field, index) => (
          <FieldsGroup
            // @ts-expect-error id defined by hook-form
            key={field.id}
            control={control}
            titleLabel={TITLE.label}
            subtitleLabel={SUBTITLE.label}
            isMainLanguage={index === 0}
            isDisabled={!isValid}
            isMarkdownMode={isMarkdownMode}
            isButtonsHidden={fields.length === 1}
            onModeSwitch={switchFormMode}
            titleFieldName={getTitleFieldName(index)}
            subtitleFieldName={getSubtitleFieldName(index)}
            languageFieldName={getLanguageFieldName(index)}
            onLanguageSelect={() => selectLanguageAsMain(index)}
            onLanguageDelete={() => deleteLanguage(index)}
          />
        ))}

        <AddButton className="ml-[11.25rem] self-start capitalize" onAdd={addLanguage} type="button">
          {t('add translation')}
        </AddButton>
      </form>
    </FormAnimationWrapper>
  );
};
