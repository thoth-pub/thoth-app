import ClickAwayListener from '../ClickAwayListener/ClickAwayListener';

type ModalWrapperProps = {
  children: React.ReactNode;
  onClickAway?: () => void;
};

const ModalWrapper = ({ children, onClickAway }: ModalWrapperProps) => {
  const content = (
    <div className="scrollbar-hidden m-auto flex max-h-160 w-full max-w-175 flex-col gap-(--default-gap) overflow-auto rounded-xl bg-(--color-modal-background) p-4 lg:rounded-2xl lg:p-8">
      {children}
    </div>
  );

  return (
    <div className="flex h-full items-center justify-center">
      {onClickAway ? <ClickAwayListener onClickAway={onClickAway}>{content}</ClickAwayListener> : content}
    </div>
  );
};

export default ModalWrapper;
