'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useFundingStateMachine } from '@/src/entities/funding/store/funding.store';
import { useReferenceStateMachine } from '@/src/entities/reference';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import { QueryKeys } from '@/src/shared/constants';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { TranslatedContent } from '@/src/shared/ui';

import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import EditContributors from '../EditContributors/EditContributors';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import EditFundings from '../EditFundings/EditFundings';
import EditPublications from '../EditPublications/EditPublications';
import EditReferences from '../EditReferences/EditReferences';

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  onDone?: () => void;
};

const EditChapterModal = (props: EditChapterModalProps) => {
  const { onDone } = props;

  const queryClient = useQueryClient();
  const { activeWorkChapters, isSingleChapterSelected, finishEditing } = useWorkChaptersStateMachine();
  const { finishEditing: finishEditingContribution } = useContributionStateMachine();
  const { finishEditing: finishEditingFunding } = useFundingStateMachine();
  const { finishEditing: finishEditingReference } = useReferenceStateMachine();

  useEffect(() => {
    return () => {
      finishEditing();
      finishEditingContribution();
      finishEditingFunding();
      finishEditingReference();
    };
  }, [finishEditing, finishEditingContribution, finishEditingFunding, finishEditingReference]);

  if (!activeWorkChapters || activeWorkChapters.length === 0) return null;

  const chapter = activeWorkChapters[0];

  const invalidateChapters = () => {
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  const handleDone = () => {
    onDone?.();
    finishEditing();
    finishEditingContribution();
    finishEditingFunding();
    finishEditingReference();
    invalidateChapters();
  };

  return (
    <FullScreenModal
      title={<TranslatedContent content="actions.editChapter" />}
      isOpen={isSingleChapterSelected}
      onClose={() => {
        finishEditing();
        finishEditingReference();
        invalidateChapters();
      }}
      onDone={handleDone}
    >
      <EditChapterBasicDetails workId={chapter.id} />
      <EditDescriptions workId={chapter.id} isSingleChapterEdit={isSingleChapterSelected} />
      <EditContributors workId={chapter.id} />
      <EditPublications workId={chapter.id} />
      <EditFundings workId={chapter.id} />
      <EditReferences workId={chapter.id} />
    </FullScreenModal>
  );
};

export default EditChapterModal;
