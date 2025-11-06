'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import { useState } from 'react';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';

// TODO WIP

type EditChaptersModalProps = Omit<BaseEditSectionProps, 'workId'>;

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { queryToken } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, edit, close } = useWorkChaptersStateMachine();

  const initValue = activeWorkChapters && activeWorkChapters.length > 0 ? activeWorkChapters : null;
  const [chapters, setChapters] = useState(initValue);

  return (
    <ChaptersModal
      title="edit chapters"
      isOpen={isMultipleChaptersSelected}
      onClose={close}
      onDone={() => console.log(chapters)}
    >
      <EditChapterBasicDetails
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        onTitleUpdate={(data) => console.log(data)}
        onLicenseUpdate={(data) => console.log(data)}
      />
      <EditDescriptions
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        onPageCountUpdate={(data) => console.log(data)}
        onMediaUpdate={(data) => console.log(data)}
        onLanguagesUpdate={(data) => console.log(data)}
        onSubjectsUpdate={(data) => console.log(data)}
      />
    </ChaptersModal>
  );
};

export default EditChaptersModal;
