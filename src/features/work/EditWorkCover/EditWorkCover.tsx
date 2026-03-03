'use client';

import { Activity } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { CoverForm } from './components/CoverForm';
import DragAndDropForm from './components/DragAndDropForm';

type EditWorkCoverProps = BaseEditSectionProps & {
  isDragAndDropEnabled?: boolean;
};

const EditWorkCover = (props: EditWorkCoverProps) => {
  const { workId } = props;

  const { idDragAndDropEnabled } = useActivePublisherPermissions();

  return (
    <>
      <Activity mode={idDragAndDropEnabled ? 'visible' : 'hidden'}>
        <DragAndDropForm workId={workId} />
      </Activity>
      <Activity mode={idDragAndDropEnabled ? 'hidden' : 'visible'}>
        <CoverForm workId={workId} />
      </Activity>
    </>
  );
};

export default EditWorkCover;
