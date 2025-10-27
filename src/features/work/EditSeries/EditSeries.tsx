'use client';

import { useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateIssue, useDeleteIssue, useSeries } from '@/src/entities/series';
import { GET_SERIES } from '@/src/entities/series/model/series.schema';
import type { IssueValidationSchema } from '@/src/entities/series/model/series.types';
import { issueValidationSchema } from '@/src/entities/series/model/series.validation';
import { useWork } from '@/src/entities/work';
import { appConfig, type BaseEditSectionProps, convertEntityToSelectFieldOptions, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { FormFields } from './components/FormFields';
import { IssuesList } from './components/IssuesList';

const { WORK_SERIES } = FORM_FIELDS;

const EditSeries = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);
  const [searchValue, setSearchValue] = useState(work.issues[0]?.seriesName ?? '');
  const { activePublisher } = usePublisherStateMachine();

  const publishersIds = activePublisher ? [activePublisher] : [];

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { series, loading, client } = useSeries(publishersIds, debouncedValue);

  const options = convertEntityToSelectFieldOptions(series, 'name');

  const isNew = work.issues.length === 0;

  const { createIssue } = useCreateIssue({ workId, queryToken });
  const { deleteIssue } = useDeleteIssue({ queryToken, workId });
  const { close } = useFormStateMachine();

  const placeholder = work.issues.map((issue) => issue.seriesName).join(', ');

  const createNewIssue = (data: IssueValidationSchema) => {
    if (!activePublisher) return;

    const selectedSeries = series.find((series) => series.id === data.series.value);

    console.log(selectedSeries);

    if (!selectedSeries) return;

    createIssue({
      orderNumber: selectedSeries.issues.length + 1,
      seriesId: selectedSeries.id,
      workId,
    });
  };

  const editIssue = (data: IssueValidationSchema) => {
    if (isNew) {
      createNewIssue(data);
      client.refetchQueries({ include: [GET_SERIES] });
      return;
    }

    deleteIssue(work.issues[0].id);
    createNewIssue(data);
    client.refetchQueries({ include: [GET_SERIES] });
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
      formFields={({ control }) => (
        <FormFields
          control={control}
          options={options}
          isLoading={loading}
          onChange={setSearchValue}
          onDelete={deleteExistingIssue}
          isDeleteDisabled={isNew}
        />
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_SERIES.label} value={placeholder} onEdit={onEdit}>
          {work.issues.length > 0 && (
            <div className="flex w-full flex-col gap-2 lg:ml-2">
              <Typography>{placeholder}</Typography>
              <IssuesList seriesName={work.issues[0].seriesName ?? ''} workId={workId} queryToken={queryToken} />
            </div>
          )}
        </Preview>
      )}
    />
  );
};

export default EditSeries;
