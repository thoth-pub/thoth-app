import Table from '../Table/Table';

const TableWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="overflow-auto">
      <Table className="border-separate">{children}</Table>
    </div>
  );
};

export default TableWrapper;
