import { mergeStyles } from '@/src/shared/utils';

const TableNewEntityFormWrapper = ({
  children,
  className,
}: {
  children?: Readonly<React.ReactNode>;
  className?: string;
}) => {
  return (
    <div className={mergeStyles('rounded-2xl bg-(--color-form-background) p-3.5 xl:p-4', className)}>{children}</div>
  );
};

export default TableNewEntityFormWrapper;
