import { TableCell, TableHead, TableRow, TranslatedContent } from '@/src/shared/ui';

type TableHeaderProps = {
  cells: (string | Readonly<React.ReactNode>)[];
  cellStyles?: string[];
};

const emptyCellStyles: NonNullable<TableHeaderProps['cellStyles']> = [];

const TableHeader = ({ cells, cellStyles = emptyCellStyles }: TableHeaderProps) => {
  return (
    <TableHead>
      <TableRow>
        {cells.map((cell, index) => (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- static header cells never reorder, and labels may repeat (e.g. empty action columns)
          <TableCell key={index} className={cellStyles[index]}>
            <>{typeof cell === 'string' ? <TranslatedContent content={cell} /> : cell}</>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default TableHeader;
