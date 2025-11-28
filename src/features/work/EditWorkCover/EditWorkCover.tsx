'use client';

import { Activity } from 'react';

import { useWork } from '@/src/entities/work';
import { BaseEditSectionProps } from '@/src/shared';
import DragAndDropForm from './components/DragAndDropForm';
import { CoverForm } from './components/CoverForm';

type EditWorkCoverProps = BaseEditSectionProps & {
  isDragAndDropEnabled?: boolean;
};

const EditWorkCover = (props: EditWorkCoverProps) => {
  const { workId, queryToken, isDragAndDropEnabled = false } = props;

  const { work } = useWork(workId, queryToken);

  return (
    <>
      <Activity mode={isDragAndDropEnabled ? 'visible' : 'hidden'}>
        <DragAndDropForm defaultValue={work.coverUrl ?? ''} />
      </Activity>
      <Activity mode={isDragAndDropEnabled ? 'hidden' : 'visible'}>
        <CoverForm workId={workId} queryToken={queryToken} />
      </Activity>
    </>
  );
};

export default EditWorkCover;
