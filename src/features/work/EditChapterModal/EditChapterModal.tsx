'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';
import EditFundings from '../EditFundings/EditFundings';
import EditContributors from '../EditContributors/EditContributors';
import { useEffect } from 'react';
import { useContributionStateMachine } from '@/src/entities/contribution';

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  onDone?: () => void;
};

const EditChapterModal = (props: EditChapterModalProps) => {
  const { queryToken, onDone } = props;

  const { activeWorkChapters, isSingleChapterSelected, close, update } = useWorkChaptersStateMachine();
  const { close: closeContribution } = useContributionStateMachine();

  useEffect(() => {
    return () => {
      close();
      closeContribution();
    };
  }, []);

  if (!activeWorkChapters || activeWorkChapters.length === 0) return null;

  const chapter = activeWorkChapters[0];

  const handleDone = () => {
    onDone?.();
    close();
    closeContribution();
  };

  return (
    <ChaptersModal title="edit chapter" isOpen={isSingleChapterSelected} onClose={close} onDone={handleDone}>
      <EditChapterBasicDetails workId={chapter.id} queryToken={queryToken} />
      <EditDescriptions workId={chapter.id} queryToken={queryToken} />
      <EditContributors workId={chapter.id} queryToken={queryToken} />
      <EditFundings workId={chapter.id} queryToken={queryToken} />
    </ChaptersModal>
  );
};

export default EditChapterModal;
