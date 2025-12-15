'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useCreateWorkChapter, useWork, useWorkChapters, useWorkChaptersStateMachine } from '@/src/entities/work';
import { BaseEditSectionProps, getDefaultChapter } from '@/src/shared';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { AddButton } from '@/src/shared/ui';

import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import { InheritedDataForm } from './components/InheritedDataForm';

const AddChapterModal = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const { chapters } = useWorkChapters({ workId });

  const { t } = useTranslation();

  const { edit } = useWorkChaptersStateMachine();
  const { close: closeContribution } = useContributionStateMachine();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return () => {
      close();
      closeContribution();
    };
  }, []);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    closeContribution();
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
    // TODO: fix titles
    const defaultChapter = getDefaultChapter({
      // title: 'New Chapter',
      status: work.status,
      coverUrl: work.coverUrl,
      landingPage: landingPage ? work.landingPage : '',
      imprintId: work.imprintId,
      place: work.place,
      license: license ? work.license : licenseOptions[0].value,
      copyrightHolder: copyrightHolder ? work.copyrightHolder : '',
      doi: '',
      fundings: fundings ? work.fundings : [],
      subjects: subjects ? work.subjects : [],
      contributions: contributors ? work.contributions : [],
    });

    createChapter({ chapter: defaultChapter, relatedWorkId: workId, ordinal: chapters.length + 1 });
  };

  return (
    <>
      <AddButton className="px-7 capitalize" onAdd={openModal} disabled={isOpen}>
        {t('add chapter')}
      </AddButton>
      <FullScreenModal title="add new chapter" isOpen={isOpen} isSubmitHidden onClose={closeModal}>
        <InheritedDataForm onSubmit={handleInheritedDataSubmit} />
      </FullScreenModal>
    </>
  );
};

export default AddChapterModal;
