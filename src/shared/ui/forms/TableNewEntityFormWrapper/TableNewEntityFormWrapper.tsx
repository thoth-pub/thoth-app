const TableNewEntityFormWrapper = ({ children }: { children?: Readonly<React.ReactNode> }) => {
  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 z-100 rounded-2xl bg-[var(--color-form-background)] lg:static lg:p-4">
      {children}
    </div>
  );
};

export default TableNewEntityFormWrapper;
