'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import { useState } from 'react';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';

// TODO WIP

type EditChaptersModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  onDone?: () => void;
};

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { queryToken, onDone } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, edit, close } = useWorkChaptersStateMachine();

  const initValue = activeWorkChapters && activeWorkChapters.length > 0 ? activeWorkChapters : null;
  const [chapters, setChapters] = useState(initValue);

  const handleDone = () => {
    onDone?.();
    close();
  };

  return (
    <ChaptersModal title="edit chapters" isOpen={isMultipleChaptersSelected} onClose={close} onDone={handleDone}>
      <EditChapterBasicDetails
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        onLicenseUpdate={(data) => console.log(data)}
      />
      <EditDescriptions
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        onLanguagesUpdate={(data) => console.log(data)}
      />
    </ChaptersModal>
  );
};

export default EditChaptersModal;
