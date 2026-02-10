'use client';

import { useEffect } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { EditWorkHeader } from '@/src/entities/work';
import { EditBasicDetails, EditContributors, EditDescriptions, EditFundings, WorkSpeedDial } from '@/src/features';
import EditPublications from '@/src/features/work/EditPublications/EditPublications';
import EditReferences from '@/src/features/work/EditReferences/EditReferences';
import EditWorkSeries from '@/src/features/work/EditWorkSeries/EditWorkSeries';
import type { BaseEditSectionProps } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { EditWorkChapters } from '../EditWorkChapters/EditWorkChapters';

type EditWorkWidgetProps = BaseEditSectionProps;

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { workId } = props;

  const { close } = useFormStateMachine();

  const { isStatusEditable, isPublicationDateEditable, isWithdrawnDateEditable } = useActivePublisherPermissions();

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader
        workId={workId}
        isStatusEditable={isStatusEditable}
        isPublicationDateEditable={isPublicationDateEditable}
        isWithdrawnDateEditable={isWithdrawnDateEditable}
      />
      <EditBasicDetails workId={workId}>
        <EditWorkSeries workId={workId} />
      </EditBasicDetails>
      <EditDescriptions workId={workId} />
      <EditContributors workId={workId} />
      <EditWorkChapters workId={workId} />
      <EditPublications workId={workId} />
      <EditFundings workId={workId} />
      <EditReferences workId={workId} />
      <WorkSpeedDial workId={workId} />
    </div>
  );
};

export default EditWorkWidget;
