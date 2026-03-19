const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="scrollbar-hidden m-auto flex max-h-160 w-full max-w-175 flex-col gap-(--default-gap) overflow-auto rounded-xl bg-(--color-modal-background) p-4 lg:rounded-2xl lg:p-8">
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
