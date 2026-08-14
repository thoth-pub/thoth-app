'use client';

import { CloseButton, ContentSection, Modal, SubmitButton, Typography } from '@/src/shared/ui';

type FullScreenModalProps = {
  title: string | Readonly<React.ReactNode>;
  isOpen: boolean;
  children?: Readonly<React.ReactNode>;
  isSubmitHidden?: boolean;
  /**
   * Whether the user may dismiss the modal. Defaults to `true`, so every existing caller keeps
   * its current behaviour. When `false`, the close control is disabled and backdrop/escape
   * dismissal is refused — used to hold the modal open while a non-atomic operation is running.
   */
  isDismissible?: boolean;
  onClose?: () => void;
  onDone?: () => void;
};

const FullScreenModal = (props: FullScreenModalProps) => {
  const { title, isOpen, children, isSubmitHidden = false, isDismissible = true, onClose, onDone } = props;

  // The single gate for every way out: the close control, the backdrop, and escape all go
  // through it, so making the modal non-dismissible closes all three at once rather than leaving
  // one open. When dismissible it behaves exactly as before.
  const dismiss = () => {
    if (!isDismissible) return;

    onClose?.();
  };

  return (
    <Modal open={isOpen} onClose={dismiss} disableEscapeKeyDown={!isDismissible}>
      <div className="relative m-auto h-dvh w-dvw overflow-auto bg-(--color-modal-content-background) px-5 py-2 xl:top-[10dvh] xl:h-[80dvh] xl:w-[90dvw] xl:rounded-2xl xl:py-3">
        <div className="m-auto flex h-full flex-row">
          <div className="flex grow flex-col gap-(--default-gap) overflow-x-auto px-8 py-[12px]">
            <ContentSection>
              <div className="flex justify-between">
                <Typography variant="h1" component="h3" className="pl-4 text-(--color-typography)">
                  {title}
                </Typography>
                <div className="flex gap-2">
                  {!isSubmitHidden && <SubmitButton onClick={onDone} />}
                  <CloseButton onClose={dismiss} disabled={!isDismissible} />
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
