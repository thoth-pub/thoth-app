'use client';

import type { Control } from 'react-hook-form';

import type { FormFieldLabel } from '@/src/shared';
import {
  FormControlGroup,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  InputLabel,
  MarkdownField,
  MarkdownSwitch,
} from '@/src/shared/ui';

import type { WorkTitlesForm } from '../../../model/work.types';
import { ButtonGroup } from './ButtonGroup';
import { LanguageField } from './LanguageField';


type FieldsGroupProps = {
  control: Control<WorkTitlesForm>;
  titleLabel: FormFieldLabel;
  subtitleLabel: FormFieldLabel;
  titleFieldName: string;
  subtitleFieldName: string;
  languageFieldName: string;
  isMainLanguage: boolean;
  isDisabled: boolean;
  isMarkdownMode: boolean;
  isButtonsHidden: boolean;
  onModeSwitch: () => void;
  onLanguageSelect: () => void;
  onLanguageDelete: () => void;
};

export const FieldsGroup = (props: FieldsGroupProps) => {
  const {
    isMarkdownMode,
    control,
    titleLabel,
    subtitleLabel,
    isDisabled,
    isButtonsHidden,
    isMainLanguage,
    titleFieldName,
    subtitleFieldName,
    languageFieldName,
    onModeSwitch,
    onLanguageSelect,
    onLanguageDelete,
  } = props;

  return (
    <div className="flex flex-col gap-[var(--default-gap)]">
      <FormFieldWrapper>
        <InputLabel>{titleLabel}</InputLabel>
        <div className="ml-[1.25rem]">
          {isMainLanguage ? (
            <FormFieldWithControlsWrapper>
              <MarkdownField name={titleFieldName} control={control} />
              <FormControlGroup isDisabled={isDisabled} />
            </FormFieldWithControlsWrapper>
          ) : (
            <MarkdownField name={titleFieldName} control={control} />
          )}
        </div>
      </FormFieldWrapper>

      <FormFieldWrapper>
        <InputLabel>{subtitleLabel}</InputLabel>
        <div className="ml-[1.25rem] flex flex-col gap-[var(--default-gap)]">
          <MarkdownField name={subtitleFieldName} control={control}>
            {isMainLanguage && <MarkdownSwitch defaultChecked={isMarkdownMode} onChange={onModeSwitch} />}
          </MarkdownField>
          <div className="flex justify-between">
            <LanguageField control={control} languageFieldName={languageFieldName} />
            {!isButtonsHidden && (
              <ButtonGroup
                onLanguageSelect={onLanguageSelect}
                onLanguageDelete={onLanguageDelete}
                isMainLanguage={isMainLanguage}
              />
            )}
          </div>
        </div>
      </FormFieldWrapper>
    </div>
  );
};
