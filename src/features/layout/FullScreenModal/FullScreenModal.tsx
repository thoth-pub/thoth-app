'use client';

import { CloseButton, ContentSection, Modal, SubmitButton, Typography } from '@/src/shared/ui';

type FullScreenModalProps = {
  title: string | Readonly<React.ReactNode>;
  isOpen: boolean;
  children?: Readonly<React.ReactNode>;
  isSubmitHidden?: boolean;
  onClose?: () => void;
  onDone?: () => void;
};

const FullScreenModal = (props: FullScreenModalProps) => {
  const { title, isOpen, children, isSubmitHidden = false, onClose, onDone } = props;

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="relative h-dvh w-dvw m-auto xl:top-[10dvh] xl:rounded-2xl overflow-auto bg-(--color-modal-content-background) px-5 py-2 xl:h-[80dvh] xl:w-[90dvw] xl:py-3">
        <div className="m-auto flex h-full flex-row">
          <div className="flex grow flex-col gap-(--default-gap) overflow-x-auto px-8 py-[12px]">
            <ContentSection>
              <div className="flex justify-between">
                <Typography variant="h1" component="h3" className="pl-4 text-(--color-typography)">
                  {title}
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
