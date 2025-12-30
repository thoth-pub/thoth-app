'use client';

import { useTranslation } from 'react-i18next';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { Navigation } from '@/src/features';
import { CloseButton, Modal, SubmitButton, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type FullScreenModalProps = {
  title: string;
  isOpen: boolean;
  children?: Readonly<React.ReactNode>;
  isSubmitHidden?: boolean;
  onClose?: () => void;
  onDone?: () => void;
};

const FullScreenModal = (props: FullScreenModalProps) => {
  const { title, isOpen, children, isSubmitHidden = false, onClose, onDone } = props;

  const { t } = useTranslation();

  const { linkedPublishers, isAdmin } = usePublisherStateMachine();

  const publishers = linkedPublishers.map((publisher) => ({
    publisherId: publisher.id,
    isAdmin: publisher.isAdmin,
  }));

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="relative h-dvh w-dvw overflow-auto bg-(--color-modal-content-background) px-8 py-2 lg:px-5 lg:py-3">
        <div className="m-auto flex h-full flex-row">
          <Navigation linkedPublishers={publishers} isSuperAdmin={isAdmin} />
          <div className="flex grow flex-col gap-(--default-gap) px-8 py-[12px]">
            <ContentSection>
              <div className="flex justify-between">
                <Typography variant="h1" component="h3" className="pl-4 text-(--color-typography)">
                  {t(title)}
                </Typography>
                <div className="flex gap-2">
                  {!isSubmitHidden && <SubmitButton onClick={onDone} />}
                  <CloseButton onClose={onClose} />
                </div>
              </div>
            </ContentSection>
            {children}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FullScreenModal;
