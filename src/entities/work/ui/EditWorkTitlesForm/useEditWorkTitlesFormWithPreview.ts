'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';

import { WorkTitlesForm } from '../../model/work.types';
import { workTitlesValidationSchema } from '../../model/work.validation';

const { TITLES, WORK_TITLE, SUBTITLE, LANGUAGE } = FORM_FIELDS;

const useEditWorkTitlesFormWithPreview = () => {
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [formFields, setFormFields] = useState<WorkTitlesForm['titles']>([]);
  const [isMarkdownSelected, setIsMarkdownSelected] = useState(true);
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(workTitlesValidationSchema),
    mode: 'onChange',
    defaultValues: { titles: [{ workTitle: '', subtitle: '', language: languageOptionsAlt[0] }] },
  });
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: FORM_FIELDS.TITLES.name,
  });

  const fullMainTitle =
    formFields.length > 0 ? formFields[0].workTitle + (formFields[0].subtitle ? `:${formFields[0].subtitle}` : '') : '';
  const selectedLanguages = formFields.map((field) => field.language.value);

  const switchPreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const onSubmit = handleSubmit((data) => {
    setFormFields(data.titles);
    switchPreviewMode();
  });

  const onFormModeSwitch = () => {
    setIsMarkdownSelected((prev) => !prev);
  };

  const onSelectMain = (fieldIndex: number) => {
    if (fieldIndex === 0) return;

    move(fieldIndex, 0);
  };

  const onDeleteLanguage = (fieldIndex: number) => {
    remove(fieldIndex);
  };

  const onAddFields = () => {
    append({ workTitle: '', subtitle: '', language: languageOptionsAlt[0] });
  };

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${TITLES.name}.${fieldIndex}.${fieldName}`;
  };

  const getTitleFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, WORK_TITLE.name);
  };

  const getSubtitleFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBTITLE.name);
  };

  const getLanguageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE.name);
  };

  return {
    fullMainTitle,
    control,
    isValid,
    fields,
    isMarkdownMode: isMarkdownSelected,
    selectedLanguages,
    isPreviewMode,
    submit: onSubmit,
    switchFormMode: onFormModeSwitch,
    selectLanguageAsMain: onSelectMain,
    deleteLanguage: onDeleteLanguage,
    addLanguage: onAddFields,
    getTitleFieldName,
    getSubtitleFieldName,
    getLanguageFieldName,
    switchPreviewMode,
  };
};

export default useEditWorkTitlesFormWithPreview;
