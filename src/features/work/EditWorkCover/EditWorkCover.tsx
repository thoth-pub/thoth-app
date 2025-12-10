'use client';

import { Activity } from 'react';

import { useWork } from '@/src/entities/work';
import { BaseEditSectionProps } from '@/src/shared';

import { CoverForm } from './components/CoverForm';
import DragAndDropForm from './components/DragAndDropForm';

type EditWorkCoverProps = BaseEditSectionProps & {
  isDragAndDropEnabled?: boolean;
};

const EditWorkCover = (props: EditWorkCoverProps) => {
  const { workId, isDragAndDropEnabled = false } = props;

  const { work } = useWork(workId);

  return (
    <>
      <Activity mode={isDragAndDropEnabled ? 'visible' : 'hidden'}>
        <DragAndDropForm defaultValue={work.coverUrl ?? ''} />
      </Activity>
      <Activity mode={isDragAndDropEnabled ? 'hidden' : 'visible'}>
        <CoverForm workId={workId} />
      </Activity>
    </>
  );
};

export default EditWorkCover;
