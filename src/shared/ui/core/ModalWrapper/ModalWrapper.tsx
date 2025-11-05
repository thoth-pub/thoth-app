const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="m-auto flex max-h-160 w-full max-w-175 flex-col gap-4 overflow-auto rounded-xl bg-[var(--color-modal-background)] p-4 lg:gap-8 lg:rounded-2xl lg:p-8">
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
