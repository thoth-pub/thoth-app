'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import { EditWorkHeader, useWork } from '@/src/entities/work';
import { EditBasicDetails, EditContributors, EditDescriptions, EditFundings, WorkSpeedDial } from '@/src/features';
import EditPublications from '@/src/features/work/EditPublications/EditPublications';
import EditReferences from '@/src/features/work/EditReferences/EditReferences';
import EditWorkSeries from '@/src/features/work/EditWorkSeries/EditWorkSeries';
import { ROUTES } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { EditWorkChapters } from '../EditWorkChapters/EditWorkChapters';
import EditWorkMarketing from '../EditWorkMarketing/EditWorkMarketing';
import EditWorkResources from '../EditWorkResources/EditWorkResources';

type EditWorkWidgetProps = BaseEditSectionProps;

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { workId } = props;

  const { userImprintsOptions, loading: userLoading } = useUser();
  const { work, loading: workLoading } = useWork(workId);
  const router = useRouter();

  const { close } = useFormStateMachine();

  const { isStatusEditable, isPublicationDateEditable, isWithdrawnDateEditable } = useActivePublisherPermissions();

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  useEffect(() => {
    if (userLoading || workLoading || userImprintsOptions.length === 0) return;

    const isUserImprint = userImprintsOptions.some((option) => option.value === work.imprintId);

    if (!isUserImprint) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [userLoading, workLoading, userImprintsOptions, work.imprintId]);

  return (
    <div className="flex flex-col gap-(--default-gap)">
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
      <EditWorkMarketing workId={workId} />
      <EditWorkResources workId={workId} />
      <EditReferences workId={workId} />
      <WorkSpeedDial workId={workId} />
    </div>
  );
};

export default EditWorkWidget;
