'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { appConfig, BaseEditSectionProps, WorkStatuses, WorkTypes } from '@/src/shared';
import { AddButton, CloseButton, Modal, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useTranslation } from 'react-i18next';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';

// TODO WIP

const defaultChapter: WorkEntity = {
  id: appConfig.defaultId,
  title: '',
  subtitle: '',
  fullTitle: '',
  type: WorkTypes.enum.BookChapter,
  updatedAt: '',
  contributorsNames: [],
  doi: '',
  publisherName: '',
  imprintId: '',
  status: WorkStatuses.enum.Forthcoming,
  edition: 0,
  license: '',
  copyrightHolder: '',
  landingPage: '',
  publicationDate: '',
  withdrawnDate: '',
  contributions: [],
  imageCount: 0,
  tableCount: 0,
  audioCount: 0,
  videoCount: 0,
  pageCount: 0,
  frontmatterCount: 0,
  backmatterCount: 0,
  languages: [],
  publications: [],
  fundings: [],
  references: [],
  subjects: [],
  issues: [],
};

const AddChapterModal = (props: Omit<BaseEditSectionProps, 'workId'>) => {
  const { queryToken } = props;

  const { activeWorkChapters, isChapterSelected, isNewChapterSelected, edit, close } = useWorkChaptersStateMachine();

  const { t } = useTranslation();

  const handleOpenModal = () => {
    close();

    edit([defaultChapter]);
  };

  return (
    <>
      <AddButton className="px-7 capitalize" onAdd={handleOpenModal} disabled={isChapterSelected}>
        {t('add chapter')}
      </AddButton>
      <Modal open={isNewChapterSelected} onClose={close}>
        <div className="flex h-dvh w-dvw flex-col gap-[var(--default-gap)] bg-[var(--color-modal-background)] p-2 lg:p-4">
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
              {t('add new chapter')}
            </Typography>
            <CloseButton onClose={close} />
          </div>
          <div>
            <EditChapterBasicDetails workId={''} queryToken={queryToken} />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddChapterModal;
