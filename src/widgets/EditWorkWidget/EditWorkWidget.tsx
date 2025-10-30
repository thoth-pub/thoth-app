'use client';

import { useEffect } from 'react';

import { EditWorkHeader } from '@/src/entities/work';
import { EditBasicDetails, EditContributors, EditDescriptions, EditFundings, WorkSpeedDial } from '@/src/features';
import EditPublications from '@/src/features/work/EditPublications/EditPublications';
import EditReferences from '@/src/features/work/EditReferences/EditReferences';
import EditWorkSeries from '@/src/features/work/EditWorkSeries/EditWorkSeries';
import type { BaseEditSectionProps, FormFieldOption } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

type EditWorkWidgetProps = BaseEditSectionProps & {
  imprintOptions: FormFieldOption[];
  isAdmin?: boolean;
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { imprintOptions, queryToken, workId, isAdmin = false } = props;

  const { close } = useFormStateMachine();

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader queryToken={queryToken} workId={workId} />
      <EditBasicDetails workId={workId} queryToken={queryToken} imprintOptions={imprintOptions}>
        <EditWorkSeries workId={workId} queryToken={queryToken} />
      </EditBasicDetails>
      <EditContributors workId={workId} queryToken={queryToken} isAdmin={isAdmin} />
      <EditDescriptions workId={workId} queryToken={queryToken} />
      <EditPublications workId={workId} queryToken={queryToken} />
      <EditFundings workId={workId} queryToken={queryToken} />
      <EditReferences workId={workId} queryToken={queryToken} />
      <WorkSpeedDial workId={workId} queryToken={queryToken} />
    </div>
  );
};

export default EditWorkWidget;
