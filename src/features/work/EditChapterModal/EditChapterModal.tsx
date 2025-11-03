'use client';

import { useWorkChaptersStateMachine } from '@/src/entities/work';
import { CloseButton, Modal, Typography } from '@/src/shared/ui';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';

type EditChapterModalProps = Omit<BaseEditSectionProps, 'workId'>;

const EditChapterModal = (props: EditChapterModalProps) => {
  const { queryToken } = props;

  const { activeWorkChapters, isSingleExistingChapterSelected, edit, close } = useWorkChaptersStateMachine();

  if (!activeWorkChapters || activeWorkChapters.length === 0) return null;

  const chapter = activeWorkChapters[0];

  return (
    <Modal open={isSingleExistingChapterSelected} onClose={close}>
      <div className="flex h-dvh w-dvw flex-col gap-[var(--default-gap)] bg-[var(--color-modal-background)] p-2 lg:p-4">
        <div className="flex justify-between">
          <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
            {chapter.title}
          </Typography>
          <CloseButton onClose={close} />
        </div>
        <div>
          <EditChapterBasicDetails workId={chapter.id} queryToken={queryToken} />
        </div>
      </div>
    </Modal>
  );
};

export default EditChapterModal;
