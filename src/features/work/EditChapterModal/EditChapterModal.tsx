'use client';

import { useEffect } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useWorkChaptersStateMachine } from '@/src/entities/work';
import type { BaseEditSectionProps } from '@/src/shared';

import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import EditContributors from '../EditContributors/EditContributors';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import EditFundings from '../EditFundings/EditFundings';

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  onDone?: () => void;
};

const EditChapterModal = (props: EditChapterModalProps) => {
  const { queryToken, onDone } = props;

  const { activeWorkChapters, isSingleChapterSelected, close } = useWorkChaptersStateMachine();
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
    <FullScreenModal title="edit chapter" isOpen={isSingleChapterSelected} onClose={close} onDone={handleDone}>
      <EditChapterBasicDetails workId={chapter.id} queryToken={queryToken} />
      <EditDescriptions workId={chapter.id} queryToken={queryToken} isSingleChapterEdit={isSingleChapterSelected} />
      <EditContributors workId={chapter.id} queryToken={queryToken} />
      <EditFundings workId={chapter.id} queryToken={queryToken} />
    </FullScreenModal>
  );
};

export default EditChapterModal;
