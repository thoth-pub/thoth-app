'use client';

import { useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateIssue, useDeleteIssue, useSerieses } from '@/src/entities/series';
import type { IssueValidationSchema } from '@/src/entities/series/model/series.types';
import { issueValidationSchema } from '@/src/entities/series/model/series.validation';
import { useWork } from '@/src/entities/work';
import { appConfig, type BaseEditSectionProps, convertEntityToSelectFieldOptions, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { DeleteButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { FormFields } from './components/FormFields';
import { IssuesList } from './components/IssuesList';

const { WORK_SERIES } = FORM_FIELDS;

const EditWorkSeries = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);
  const [searchValue, setSearchValue] = useState(work.issues[0]?.seriesName ?? '');
  const { activePublisher } = usePublisherStateMachine();

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { serieses, loading } = useSerieses({ filter: debouncedValue });

  const options = convertEntityToSelectFieldOptions(serieses, 'name');

  const isNew = work.issues.length === 0;

  const { createIssue } = useCreateIssue({ queryToken });
  const { deleteIssue } = useDeleteIssue({ queryToken });
  const { close } = useFormStateMachine();

  const placeholder = work.issues.length > 0 ? `vol. ${work.issues[0].ordinal} of ${work.issues[0].seriesName}` : '';

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
    close();
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
      formFields={({ control, setValue }) => (
        <FormFields
          control={control}
          options={options}
          isLoading={loading}
          isDeleteDisabled={isNew}
          onChange={setSearchValue}
          onDelete={deleteExistingIssue}
          setValue={setValue}
        >
          {work.issues.length > 0 && <IssuesList workId={workId} queryToken={queryToken} issues={[]} />}
        </FormFields>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={WORK_SERIES.label} value={placeholder} disabled={disabled} onEdit={onEdit}>
          {work.issues.length > 0 && (
            <div className="flex w-full items-center justify-between gap-2 lg:ml-2">
              <Typography className="self-start">{placeholder}</Typography>
              <DeleteButton
                disabled={isNew}
                onClick={deleteExistingIssue}
                className="self-end opacity-0 group-hover:opacity-100"
              />
            </div>
          )}
        </Preview>
      )}
    />
  );
};

export default EditWorkSeries;
