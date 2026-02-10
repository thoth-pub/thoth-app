'use client';

import { Activity } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { useWork } from '@/src/entities/work';
import { BaseEditSectionProps } from '@/src/shared';

import { CoverForm } from './components/CoverForm';
import DragAndDropForm from './components/DragAndDropForm';

type EditWorkCoverProps = BaseEditSectionProps & {
  isDragAndDropEnabled?: boolean;
};

const EditWorkCover = (props: EditWorkCoverProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const { idDragAndDropEnabled } = useActivePublisherPermissions();

  return (
    <>
      <Activity mode={idDragAndDropEnabled ? 'visible' : 'hidden'}>
        <DragAndDropForm defaultValue={work.coverUrl ?? ''} />
      </Activity>
      <Activity mode={idDragAndDropEnabled ? 'hidden' : 'visible'}>
        <CoverForm workId={workId} />
      </Activity>
    </>
  );
};

export default EditWorkCover;
