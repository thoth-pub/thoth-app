'use client';

import { useEffect } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useFundingStateMachine } from '@/src/entities/funding/store/funding.store';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import type { BaseEditSectionProps } from '@/src/shared';
import { TranslatedContent } from '@/src/shared/ui';

import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import EditContributors from '../EditContributors/EditContributors';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import EditFundings from '../EditFundings/EditFundings';

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  onDone?: () => void;
};

const EditChapterModal = (props: EditChapterModalProps) => {
  const { onDone } = props;

  const { activeWorkChapters, isSingleChapterSelected, close } = useWorkChaptersStateMachine();
  const { close: closeContribution } = useContributionStateMachine();
  const { close: closeFunding } = useFundingStateMachine();

  useEffect(() => {
    return () => {
      close();
      closeContribution();
      closeFunding();
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
    <FullScreenModal
      title={<TranslatedContent content="actions.editChapter" />}
      isOpen={isSingleChapterSelected}
      onClose={close}
      onDone={handleDone}
    >
      <EditChapterBasicDetails workId={chapter.id} />
      <EditDescriptions workId={chapter.id} isSingleChapterEdit={isSingleChapterSelected} />
      <EditContributors workId={chapter.id} />
      <EditFundings workId={chapter.id} />
    </FullScreenModal>
  );
};

export default EditChapterModal;
