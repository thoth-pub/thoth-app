import { TableCell, TableHead, TableRow, TranslatedContent } from '@/src/shared/ui';

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
            <>{typeof cell === 'string' ? <TranslatedContent content={cell} /> : cell}</>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default TableHeader;
