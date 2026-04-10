'use client';

import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useWork, useWorkChapters } from '@/src/entities/work';
import useBulkCreateWorkChapters from '@/src/entities/work/api/hooks/useBulkCreateWorkChapters';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import { appConfig } from '@/src/shared/config';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, TranslatedContent } from '@/src/shared/ui';
import { getDefaultChapter } from '@/src/shared/utils';

import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import { InheritedDataForm } from './components/InheritedDataForm';

const AddChapterModal = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const { chapters } = useWorkChapters({ workId });

  const { edit, finishEditing } = useWorkChaptersStateMachine();
  const { finishEditing: finishEditingContribution } = useContributionStateMachine();

  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
    finishEditingContribution();
  };

  const { createChapters, isCreating, progress } = useBulkCreateWorkChapters({
    onSingleCompleted: (chapter) => {
      closeModal();
      edit([chapter]);
    },
    onBulkCompleted: () => {
      closeModal();
    },
  });

  useEffect(() => {
    return () => {
      finishEditing();
      finishEditingContribution();
    };
  }, []);

  const handleInheritedDataSubmit = (data: {
    chapterCount: number;
    landingPage: boolean;
    license: boolean;
    copyrightHolder: boolean;
    contributors: boolean;
    fundings: boolean;
    subjects: boolean;
  }) => {
    const { chapterCount, landingPage, license, copyrightHolder, contributors, fundings, subjects } = data;

    const chaptersToCreate = Array.from({ length: chapterCount }, (_, i) => {
      const ordinal = chapters.length + i + 1;

      return getDefaultChapter({
        titles: work.titles.map(({ subtitle: _subtitle, title: _title, fullTitle: _fullTitle, ...rest }) => ({
          ...rest,
          id: appConfig.defaultId,
          subtitle: '',
          title: `New chapter ${ordinal}`,
          fullTitle: `New chapter ${ordinal}`,
        })),
        status: work.status,
        coverUrl: work.coverUrl,
        landingPage: landingPage ? work.landingPage : '',
        imprintId: work.imprintId,
        place: work.place,
        license: license ? work.license : '',
        copyrightHolder: copyrightHolder ? work.copyrightHolder : '',
        publicationDate: work.publicationDate,
        withdrawnDate: work.withdrawnDate,
        doi: '',
        fundings: fundings ? work.fundings : [],
        subjects: subjects ? work.subjects : [],
        contributions: contributors ? work.contributions : [],
      });
    });

    createChapters(chaptersToCreate, workId, chapters.length + 1);
  };

  return (
    <>
      <AddButton className="px-4 capitalize" onAdd={() => setIsOpen(true)} disabled={isOpen}>
        <TranslatedContent content="actions.addNewChapter" />
      </AddButton>
      <FullScreenModal
        title={<TranslatedContent content={'actions.addNewChapter'} />}
        isOpen={isOpen}
        isSubmitHidden
        onClose={isCreating ? undefined : closeModal}
      >
        <InheritedDataForm onSubmit={handleInheritedDataSubmit} isLoading={isCreating} progress={progress} />
      </FullScreenModal>
    </>
  );
};

export default AddChapterModal;
