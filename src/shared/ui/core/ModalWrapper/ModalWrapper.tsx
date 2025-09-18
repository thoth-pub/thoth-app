const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="m-auto flex max-h-150 w-full max-w-175 flex-col gap-8 rounded-2xl bg-[var(--color-modal-background)] p-8">
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
