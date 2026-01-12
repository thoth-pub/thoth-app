'use client';
import { useQueryClient } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';

import { useCreateAbstract, useDeleteAbstract, useUpdateAbstract, useWork } from '@/src/entities/work';
import { WorkAbstractsForm } from '@/src/entities/work/model/work.types';
import { workAbstractsValidationSchema } from '@/src/entities/work/model/work.validation';
import {
  AbstractEntity,
  AbstractId,
  appConfig,
  type BaseRecommendedSectionProps,
  IDs,
  isDefaultId,
  isTextContainsAnyMarkdownTag,
  LocaleCodeType,
  QueryKeys,
} from '@/src/shared';
import { AbstractTypes } from '@/src/shared/constants/abstracts';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { MarkdownRenderer, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { AbstractsFormFields } from './AbstractsFormFields';

const { WORK_ABSTRACTS, MARKDOWN_FORMAT } = FORM_FIELDS;

export const EditAbstracts = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const queryClient = useQueryClient();
  const { createAbstract } = useCreateAbstract(workId);
  const { updateAbstract } = useUpdateAbstract(workId);
  const { deleteAbstract } = useDeleteAbstract();
  const { close } = useFormStateMachine();

  const longAbstracts = work.abstracts.filter((abstract) => abstract.type === AbstractTypes.enum.Long);
  const shortAbstracts = work.abstracts.filter((abstract) => abstract.type === AbstractTypes.enum.Short);
  const isMarkdownFormat = work.abstracts.some((abstract) => isTextContainsAnyMarkdownTag(abstract.content));

  const longAbstract = longAbstracts.find((abstract) => abstract.canonical);
  const shortAbstract = shortAbstracts.find((abstract) => abstract.canonical);
  const shortAbstractContent = shortAbstract?.content ?? '';
  const longAbstractContent = longAbstract?.content ?? '';

  const placeholderValue =
    shortAbstractContent.length > 0 ? `${longAbstractContent} \n ${shortAbstractContent}` : longAbstractContent;

  const defaultValues = longAbstracts.map(({ id, localeCode, content }) => {
    const language = languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase());

    const defaultValue = {
      longAbstractId: id,
      shortAbstractId: appConfig.defaultId,
      abstract: content,
      shortAbstract: '',
      language: language ?? languageOptionsAlt[0],
    };

    const shortAbstract = shortAbstracts.find((abstract) => abstract.localeCode === localeCode);

    if (shortAbstract) {
      defaultValue.shortAbstractId = shortAbstract.id;
      defaultValue.shortAbstract = shortAbstract.content;
    }

    return defaultValue;
  });

  const handleSubmit = async (data: WorkAbstractsForm) => {
    const { abstracts = [], markdownFormat } = data;

    if (abstracts.length === 0) return;

    const markupFormat = markdownFormat ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;

    const newLongAbstracts = abstracts.filter(
      ({ longAbstractId, abstract }) => isDefaultId(longAbstractId) && abstract && abstract.length > 0,
    );
    const newShortAbstracts = abstracts.filter(
      ({ shortAbstractId, shortAbstract }) => isDefaultId(shortAbstractId) && shortAbstract && shortAbstract.length > 0,
    );
    const updatedLongAbstracts = abstracts.filter(
      ({ longAbstractId, abstract }) => !isDefaultId(longAbstractId) && abstract && abstract.length > 0,
    );
    const updatedShortAbstracts = abstracts.filter(
      ({ shortAbstractId, shortAbstract }) =>
        !isDefaultId(shortAbstractId) && shortAbstract && shortAbstract.length > 0,
    );

    const promises: Promise<AbstractEntity>[] = [];

    newLongAbstracts.forEach(({ longAbstractId, abstract, language }, index) => {
      if (!abstract) return;

      promises.push(
        createAbstract({
          data: {
            id: longAbstractId,
            content: abstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Long,
            canonical: longAbstracts.length === 0 && index === 0,
          },
          markupFormat,
        }),
      );
    });

    newShortAbstracts.forEach(({ shortAbstractId, shortAbstract, language }) => {
      if (!shortAbstract) return;

      promises.push(
        createAbstract({
          data: {
            id: shortAbstractId,
            content: shortAbstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Short,
            canonical: false,
          },
          markupFormat,
        }),
      );
    });

    updatedLongAbstracts.forEach(({ longAbstractId, abstract, language }) => {
      const existingLongAbstract = longAbstracts.find((abstract) => abstract.id === longAbstractId);

      if (!existingLongAbstract || !abstract) return;

      const isContentChanged = existingLongAbstract.content !== abstract;
      const isLanguageChanged = existingLongAbstract.localeCode !== language.value;

      if (!isContentChanged && !isLanguageChanged) return;

      promises.push(
        updateAbstract({
          data: {
            id: longAbstractId,
            content: abstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Long,
            canonical: existingLongAbstract.canonical,
          },
          markupFormat,
        }),
      );
    });

    updatedShortAbstracts.forEach(({ shortAbstractId, shortAbstract, language }) => {
      const existingShortAbstract = shortAbstracts.find((abstract) => abstract.id === shortAbstractId);

      if (!existingShortAbstract || !shortAbstract) return;

      const isContentChanged = existingShortAbstract.content !== shortAbstract;
      const isLanguageChanged = existingShortAbstract.localeCode !== language.value;

      if (!isContentChanged && !isLanguageChanged) return;

      promises.push(
        updateAbstract({
          data: {
            id: shortAbstractId,
            content: shortAbstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Short,
            canonical: existingShortAbstract.canonical,
          },
          markupFormat,
        }),
      );
    });

    await Promise.all(promises);
  };

  const deleteAbstracts = async (shortAbstractId: AbstractId, longAbstractId: AbstractId) => {
    const promises = [];

    if (work.abstracts.length === 2) {
      close();
    }

    if (!isDefaultId(shortAbstractId)) {
      promises.push(deleteAbstract(shortAbstractId));
    }

    if (!isDefaultId(longAbstractId)) {
      promises.push(deleteAbstract(longAbstractId));
    }

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
  };

  return (
    <EditableContent
      formId={IDs.WORK_ABSTRACT}
      defaultValues={{
        [WORK_ABSTRACTS.name]: defaultValues,
        [MARKDOWN_FORMAT.name]: isMarkdownFormat,
      }}
      validationSchema={workAbstractsValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <AbstractsFormFields
          control={control as unknown as Control<WorkAbstractsForm>}
          isHelperTextVisible={isHelperTextVisible}
          onDelete={deleteAbstracts}
        />
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_ABSTRACTS.label} value={placeholderValue} onEdit={onEdit}>
          <MarkdownRenderer markdown={placeholderValue} />
        </Preview>
      )}
    />
  );
};
