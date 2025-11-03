'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import { CloseButton, Modal, Typography } from '@/src/shared/ui';
import { useTranslation } from 'react-i18next';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';

// TODO WIP

type EditChaptersModalProps = Omit<BaseEditSectionProps, 'workId'>;

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { queryToken } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, edit, close } = useWorkChaptersStateMachine();

  const { t } = useTranslation();

  return (
    <Modal open={isMultipleChaptersSelected} onClose={close}>
      <div className="flex h-dvh w-dvw flex-col gap-[var(--default-gap)] bg-[var(--color-modal-background)] p-2 lg:p-4">
        <div className="flex justify-between">
          <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
            {t('edit multiple chapters')}
          </Typography>
          <CloseButton onClose={close} />
        </div>
        <div>
          <EditChapterBasicDetails workId={''} queryToken={queryToken} isMultipleChaptersEdit />
        </div>
      </div>
    </Modal>
  );
};

export default EditChaptersModal;
