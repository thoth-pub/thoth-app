'use client';
import { useQueryClient } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';

import { useCreateAbstract, useDeleteAbstract, useUpdateAbstract } from '@/src/entities/abstract';
import { useWork } from '@/src/entities/work';
import { WorkAbstractsForm } from '@/src/entities/work/model/work.types';
import { workAbstractsValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, IDs, languageOptionsAlt, QueryKeys } from '@/src/shared/constants';
import { AbstractTypes } from '@/src/shared/constants/abstracts';
import { useDefaultLocaleOption, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { AbstractEntity, AbstractId, BaseRecommendedSectionProps, LocaleCodeType } from '@/src/shared/types';
import { Chip, MarkdownRenderer, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { isDefaultId, truncateString } from '@/src/shared/utils';

import { computeAbstractsDiff } from './abstractsDiff';
import { AbstractsFormFields } from './AbstractsFormFields';

const { WORK_ABSTRACTS } = FORM_FIELDS;
const { WORK_ABSTRACT: WORK_ABSTRACT_HELPER_TEXT } = HELPER_TEXT;

export const EditAbstracts = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const queryClient = useQueryClient();
  const { createAbstract } = useCreateAbstract(workId);
  const { updateAbstract } = useUpdateAbstract(workId);
  const { deleteAbstract, loading: deleteAbstractLoading } = useDeleteAbstract(workId);
  const { closeForm } = useFormStateMachine();
  const defaultLocaleOption = useDefaultLocaleOption(work.imprintId);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const longAbstracts = work.abstracts.filter((abstract) => abstract.type === AbstractTypes.enum.Long);
  const shortAbstracts = work.abstracts.filter((abstract) => abstract.type === AbstractTypes.enum.Short);

  const longAbstract = longAbstracts.find((abstract) => abstract.canonical);
  const longAbstractContent = longAbstract?.content ?? '';
  const longAbstractPreview = truncateString(longAbstractContent, appConfig.maxLongAbstractPreviewChars);

  const uniqueLocales = [...new Set(work.abstracts.map(({ localeCode }) => localeCode))];

  const defaultValues = uniqueLocales.map((localeCode) => {
    const language = languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase());

    const longAbstract = longAbstracts.find((abstract) => abstract.localeCode === localeCode);
    const shortAbstract = shortAbstracts.find((abstract) => abstract.localeCode === localeCode);

    return {
      longAbstractId: longAbstract?.id ?? appConfig.defaultId,
      shortAbstractId: shortAbstract?.id ?? appConfig.defaultId,
      abstract: longAbstract?.content ?? '',
      shortAbstract: shortAbstract?.content ?? '',
      language: language ?? defaultLocaleOption,
    };
  });

  const handleSubmit = async (data: WorkAbstractsForm) => {
    const { abstracts = [] } = data;

    if (abstracts.length === 0) return;

    const desiredAbstracts = abstracts.flatMap(
      ({ longAbstractId, shortAbstractId, abstract, shortAbstract, language }) => {
        const entries: AbstractEntity[] = [];

        if (abstract && abstract.length > 0) {
          entries.push({
            id: longAbstractId,
            content: abstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Long,
            canonical: false,
          });
        }

        if (shortAbstract && shortAbstract.length > 0) {
          entries.push({
            id: shortAbstractId,
            content: shortAbstract,
            localeCode: language.value as LocaleCodeType,
            type: AbstractTypes.enum.Short,
            canonical: false,
          });
        }

        return entries;
      },
    );

    const { abstractsToDelete, updatedAbstracts, newAbstracts } = computeAbstractsDiff(
      desiredAbstracts,
      work.abstracts,
    );

    // Deletions only remove content the user discarded, and must run first so a
    // replacement canonical abstract does not clash with the deleted one.
    await Promise.all(abstractsToDelete.map(({ id }) => deleteAbstract(id)));
    await Promise.all(updatedAbstracts.map((abstract) => updateAbstract({ data: abstract })));
    await Promise.all(newAbstracts.map((abstract) => createAbstract({ data: abstract })));
  };

  const deleteAbstracts = async (shortAbstractId: AbstractId, longAbstractId: AbstractId) => {
    const promises = [];

    if (work.abstracts.length <= 2) {
      closeForm();
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
      }}
      validationSchema={workAbstractsValidationSchema}
      onSubmit={handleSubmit}
      faq={WORK_ABSTRACT_HELPER_TEXT}
      formFields={({ control }) => (
        <AbstractsFormFields
          control={control as unknown as Control<WorkAbstractsForm>}
          defaultLocaleOption={defaultLocaleOption}
          deleteLoading={deleteAbstractLoading}
          onDelete={deleteAbstracts}
        />
      )}
      preview={({ onEdit, disabled }) => (
        <Preview
          label={WORK_ABSTRACTS.label}
          value={work.abstracts.length > 0 ? longAbstractContent || ' ' : ''}
          onEdit={onEdit}
          disabled={disabled}
        >
          <div className="flex flex-col gap-2">
            <Typography component="span">
              <MarkdownRenderer markdown={longAbstractPreview} />
            </Typography>
            <ul className="flex flex-wrap gap-1">
              {shortAbstracts.length > 0 && (
                <Chip
                  label={`${t('short abstracts')}: ${shortAbstracts.length}`}
                  size="small"
                  component="li"
                  variant="outlined"
                />
              )}
              {longAbstracts.map(({ id, localeCode }) => (
                <Chip key={id} label={localeCode} size="small" component="li" />
              ))}
            </ul>
          </div>
        </Preview>
      )}
    />
  );
};
