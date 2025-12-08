import Table from '../Table/Table';

type TableWrapperProps = {
  children: React.ReactNode;
  isOverflowHidden?: boolean;
};

const TableWrapper = ({ children, isOverflowHidden = false }: TableWrapperProps) => {
  return (
    <div className={isOverflowHidden ? 'overflow-hidden' : 'overflow-auto'}>
      <Table className="border-separate">{children}</Table>
    </div>
  );
};

export default TableWrapper;
