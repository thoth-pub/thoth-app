import { TableCell, TableHead, TableRow, Typography } from '@/src/shared/ui';

type ContributorsTableHeaderProps = {
  cells: string[];
};

export const ContributorsTableHeader = ({ cells }: ContributorsTableHeaderProps) => {
  return (
    <TableHead>
      <TableRow>
        {cells.map((cell) => (
          <TableCell key={cell}>
            <Typography
              variant="h2"
              component="span"
              sx={{ fontFamily: 'unset', fontWeight: 'unset', textTransform: 'unset' }}
            >
              {cell}
            </Typography>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};
