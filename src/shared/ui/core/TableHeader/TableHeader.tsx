import { TableCell, TableHead, TableRow, Typography } from '@/src/shared/ui';

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
            <>
              {typeof cell === 'string' ? (
                <Typography
                  variant="h2"
                  component="span"
                  sx={{
                    fontFamily: 'unset',
                    fontWeight: 'unset',
                    textTransform: 'unset',
                    fontSize: '1rem',
                    '@media (min-width: 1024px)': { fontSize: '1.375rem' },
                  }}
                >
                  {cell}
                </Typography>
              ) : (
                <>{cell}</>
              )}
            </>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default TableHeader;
