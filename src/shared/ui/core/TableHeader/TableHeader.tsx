import { TableCell, TableHead, TableRow } from '@/src/shared/ui';

type TableHeaderProps = {
  cells: (string | Readonly<React.ReactNode>)[];
  cellStyles?: string[];
};

const TableHeader = ({ cells, cellStyles = [] }: TableHeaderProps) => {
  return (
    <TableHead>
      <TableRow>
        {cells.map((cell, index) => (
          <TableCell key={index} className={cellStyles[index]}>
            <>{cell}</>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default TableHeader;
