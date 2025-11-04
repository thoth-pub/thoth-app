'use client';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { Navigation } from '@/src/features';
import { CloseButton, Modal, SubmitButton, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useTranslation } from 'react-i18next';

type ChaptersModalProps = {
  title: string;
  isOpen: boolean;
  children?: Readonly<React.ReactNode>;
  onClose?: () => void;
  onDone?: () => void;
};

const ChaptersModal = (props: ChaptersModalProps) => {
  const { title, isOpen, children, onClose, onDone } = props;

  const { t } = useTranslation();

  const { linkedPublishers } = usePublisherStateMachine();

  const publisherIds = linkedPublishers.map((publisher) => publisher.id);

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="relative flex h-dvh w-dvw flex-row overflow-auto bg-[var(--color-modal-content-background)] px-3 py-2 lg:px-5 lg:py-3">
        <Navigation linkedPublishers={publisherIds} />
        <div className="flex grow flex-col gap-[var(--default-gap)] px-3 py-[12px]">
          <ContentSection>
            <div className="flex justify-between">
              <Typography variant="h1" component="h3" className="text-[var(--color-typography)] capitalize">
                {t(title)}
              </Typography>
              <div className="flex gap-1">
                <SubmitButton onClick={onDone} />
                <CloseButton onClose={onClose} />
              </div>
            </div>
          </ContentSection>
          {children}
        </div>
      </div>
    </Modal>
  );
};

export default ChaptersModal;
