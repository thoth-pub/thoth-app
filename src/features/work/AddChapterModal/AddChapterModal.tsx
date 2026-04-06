'use client';

import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useCreateWorkChapter, useWork, useWorkChapters } from '@/src/entities/work';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import { appConfig } from '@/src/shared/config';
import { licenseOptions } from '@/src/shared/constants';
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

  useEffect(() => {
    return () => {
      finishEditing();
      finishEditingContribution();
    };
  }, []);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    finishEditingContribution();
  };

  const { createChapter } = useCreateWorkChapter({
    onCompleted: (chapter) => {
      closeModal();
      edit([chapter]);
    },
  });

  const handleInheritedDataSubmit = (data: {
    landingPage: boolean;
    license: boolean;
    copyrightHolder: boolean;
    contributors: boolean;
    fundings: boolean;
    subjects: boolean;
  }) => {
    const { landingPage, license, copyrightHolder, contributors, fundings, subjects } = data;

    const defaultChapter = getDefaultChapter({
      titles: work.titles.map(({subtitle, title, fullTitle, ...rest}) => ({ ...rest, id: appConfig.defaultId, subtitle: '', title: "New chapter", fullTitle: "New chapter" })),
      status: work.status,
      coverUrl: work.coverUrl,
      landingPage: landingPage ? work.landingPage : '',
      imprintId: work.imprintId,
      place: work.place,
      license: license ? work.license : licenseOptions[0].value,
      copyrightHolder: copyrightHolder ? work.copyrightHolder : '',
      publicationDate: work.publicationDate,
      withdrawnDate: work.withdrawnDate,
      doi: '',
      fundings: fundings ? work.fundings : [],
      subjects: subjects ? work.subjects : [],
      contributions: contributors ? work.contributions : [],
    });

    createChapter({ chapter: defaultChapter, relatedWorkId: workId, ordinal: chapters.length + 1 });
  };

  return (
    <>
      <AddButton className="px-4 capitalize" onAdd={openModal} disabled={isOpen}>
        <TranslatedContent content="actions.addNewChapter" />
      </AddButton>
      <FullScreenModal
        title={<TranslatedContent content={'actions.addNewChapter'} />}
        isOpen={isOpen}
        isSubmitHidden
        onClose={closeModal}
      >
        <InheritedDataForm onSubmit={handleInheritedDataSubmit} />
      </FullScreenModal>
    </>
  );
};

export default AddChapterModal;
