import { TableCell, TableHead, TableRow, Typography } from '@/src/shared/ui';

type TableHeaderProps = {
  cells: string[];
};

export const TableHeader = ({ cells }: TableHeaderProps) => {
  return (
    <TableHead>
      <TableRow>
        {cells.map((cell) => (
          <TableCell key={cell}>
            <Typography variant="h2" component="span" color="primary">
              {cell}
            </Typography>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};
