'use client';

import { useEffect } from 'react';

import { EditWorkHeader } from '@/src/entities/work';
import { EditBasicDetails, EditContributors, EditDescriptions, EditFundings, WorkSpeedDial } from '@/src/features';
import EditPublications from '@/src/features/work/EditPublications/EditPublications';
import EditReferences from '@/src/features/work/EditReferences/EditReferences';
import EditWorkSeries from '@/src/features/work/EditWorkSeries/EditWorkSeries';
import type { BaseEditSectionProps, FormFieldOption } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { EditWorkChapters } from '../EditWorkChapters/EditWorkChapters';

type EditWorkWidgetProps = BaseEditSectionProps & {
  imprintOptions: FormFieldOption[];
  isAdmin?: boolean;
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { imprintOptions, workId, isAdmin = false } = props;

  const { close } = useFormStateMachine();

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader workId={workId} />
      <EditBasicDetails workId={workId} imprintOptions={imprintOptions}>
        <EditWorkSeries workId={workId} />
      </EditBasicDetails>
      <EditDescriptions workId={workId} />
      <EditContributors workId={workId} isAdmin={isAdmin} />
      <EditWorkChapters workId={workId} />
      <EditPublications workId={workId} />
      <EditFundings workId={workId} />
      <EditReferences workId={workId} />
      <WorkSpeedDial workId={workId} />
    </div>
  );
};

export default EditWorkWidget;
