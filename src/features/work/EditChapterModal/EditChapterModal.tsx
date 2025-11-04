'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';

// TODO WIP

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'>;

const EditChapterModal = (props: EditChapterModalProps) => {
  const { queryToken } = props;

  const { activeWorkChapters, isSingleExistingChapterSelected, edit, close } = useWorkChaptersStateMachine();

  if (!activeWorkChapters || activeWorkChapters.length === 0) return null;

  const chapter = activeWorkChapters[0];

  return (
    <ChaptersModal
      title={chapter.title}
      isOpen={isSingleExistingChapterSelected}
      onClose={close}
      onDone={() => console.log(chapter)}
    >
      <EditChapterBasicDetails workId={chapter.id} queryToken={queryToken} />
      <EditDescriptions workId={chapter.id} queryToken={queryToken} />
    </ChaptersModal>
  );
};

export default EditChapterModal;
