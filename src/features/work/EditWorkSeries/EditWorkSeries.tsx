'use client';

import { useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateIssue, useDeleteIssue, useSerieses } from '@/src/entities/series';
import type { IssueValidationSchema } from '@/src/entities/series/model/series.types';
import { issueValidationSchema } from '@/src/entities/series/model/series.validation';
import { useWork } from '@/src/entities/work';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { useDebouncedValue, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { DeleteButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

import { FormFields } from './components/FormFields';

const { WORK_SERIES } = FORM_FIELDS;
const { WORK_SERIES: WORK_SERIES_HELPER_TEXT } = HELPER_TEXT;

const EditWorkSeries = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const [searchValue, setSearchValue] = useState(work.issues[0]?.seriesName ?? '');
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { serieses, loading } = useSerieses({ publishersIds, filter: debouncedValue });

  const options = convertEntityToSelectFieldOptions(serieses, 'name');
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const isNew = work.issues.length === 0;

  const { createIssue } = useCreateIssue();
  const { deleteIssue, loading: deleteIssueLoading } = useDeleteIssue();
  const { closeForm } = useFormStateMachine();

  const placeholder =
    work.issues.length > 0
      ? t('volumeOf', {
          volumeNumber: work.issues[0].ordinal,
          seriesTitle: work.issues[0].seriesName,
        })
      : '';

  const createNewIssue = (data: IssueValidationSchema) => {
    if (!activePublisher) return;

    const selectedSeries = serieses.find((series) => series.id === data.series.value);

    if (!selectedSeries) return;

    createIssue({
      orderNumber: data.ordinal,
      seriesId: selectedSeries.id,
      workId,
    });
  };

  const editIssue = async (data: IssueValidationSchema) => {
    if (!isNew) {
      await deleteIssue(work.issues[0].id);
    }

    createNewIssue(data);
  };

  const deleteExistingIssue = () => {
    const issue = work.issues[0];

    if (!issue) return;

    deleteIssue(issue.id);
    closeForm();
    setSearchValue('');
  };

  return (
    <EditableContent
      formId={IDs.WORK_SERIES}
      defaultValues={{
        [WORK_SERIES.name]: {
          value: isNew ? '' : work.issues[0].seriesName,
          label: isNew ? '' : work.issues[0].seriesName,
        },
      }}
      validationSchema={issueValidationSchema}
      onSubmit={editIssue}
      faq={WORK_SERIES_HELPER_TEXT}
      formFields={({ control, setValue }) => (
        <FormFields
          control={control}
          options={options}
          isLoading={loading}
          isDeleteDisabled={isNew}
          deleteLoading={deleteIssueLoading}
          onChange={setSearchValue}
          onDelete={deleteExistingIssue}
          setValue={setValue}
        />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={WORK_SERIES.label} value={placeholder} disabled={disabled} onEdit={onEdit}>
          {work.issues.length > 0 && (
            <div className="flex w-full items-center justify-between gap-2">
              <Typography className="self-start">{placeholder}</Typography>
              <DeleteButton
                disabled={isNew || deleteIssueLoading}
                onClick={deleteExistingIssue}
                className="my-auto h-4 w-4 self-end p-0 opacity-0 group-hover:opacity-100"
              />
            </div>
          )}
        </Preview>
      )}
    />
  );
};

export default EditWorkSeries;
