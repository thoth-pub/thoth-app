'use client';

import {
  useCreateWork,
  useCreateWorkRelation,
  useWork,
  useWorkChapters,
  useWorkChaptersStateMachine,
} from '@/src/entities/work';
import { BaseEditSectionProps, getDefaultChapter } from '@/src/shared';
import { AddButton } from '@/src/shared/ui';
import { useTranslation } from 'react-i18next';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';
import { InheritedDataForm } from './components/InheritedDataForm';
import { RelationType } from '@/gql/graphql';
import { useState } from 'react';
import { licenseOptions } from '@/src/shared/constants/formFields';

const AddChapterModal = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);
  const { chapters } = useWorkChapters({ workId });

  const { t } = useTranslation();

  const { edit } = useWorkChaptersStateMachine();

  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const { createWorkRelation } = useCreateWorkRelation({
    queryToken,
  });

  const { createWork } = useCreateWork({
    queryToken,
    onCompleted: (work) => {
      createWorkRelation({
        variables: {
          data: {
            relatorWorkId: work.id,
            relatedWorkId: workId,
            relationOrdinal: chapters.length + 1,
            relationType: RelationType.IsChildOf,
          },
        },
      });

      closeModal();
      edit([work]);
    },
  });

  const handleInheritedDataSubmit = (data: { license: boolean; copyrightHolder: boolean }) => {
    const { license, copyrightHolder } = data;

    const defaultChapter = getDefaultChapter({
      title: 'New Chapter',
      fullTitle: 'New Chapter',
      status: work.status,
      coverUrl: work.coverUrl,
      landingPage: work.landingPage,
      imprintId: work.imprintId,
      license: license ? work.license : licenseOptions[0].value,
      copyrightHolder: copyrightHolder ? work.copyrightHolder : '',
    });

    createWork(defaultChapter);
  };

  return (
    <>
      <AddButton className="px-7 capitalize" onAdd={openModal} disabled={isOpen}>
        {t('add chapter')}
      </AddButton>
      <ChaptersModal title="add new chapter" isOpen={isOpen} isSubmitHidden onClose={closeModal}>
        <InheritedDataForm onSubmit={handleInheritedDataSubmit} />
      </ChaptersModal>
    </>
  );
};

export default AddChapterModal;
