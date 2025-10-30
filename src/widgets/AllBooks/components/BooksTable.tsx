'use client';

import FileOpenIcon from '@mui/icons-material/FileOpen';

import type { BookEntity } from '@/src/entities/book/model/book.types';
import { convertOptionToString, convertUpdatedAtToFormattedDate } from '@/src/shared';
import {
  ButtonGroup,
  Chip,
  IconButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Typography,
} from '@/src/shared/ui';
import { CircularProgress } from '@/src/shared/ui';

type BooksTableProps = {
  loading: boolean;
  books: BookEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
  navigateToWork: (id: string) => void;
};

const cellStyles = 'border-t-1 border-b-1 border-transparent group-hover:border-[var(--color-table-border-alt)]';

export const BooksTable = (props: BooksTableProps) => {
  const { loading, books, page, pagesCount, onPageChange, navigateToWork } = props;

  return (
    <>
      <div className="overflow-auto">
        <Table className="border-separate">
          <TableHeader
            cells={['Int. ID', 'Title', 'Status', 'Type', 'Contributors', 'Updated At']}
            cellStyles={[
              'min-w-[90px]',
              'min-w-[210px]',
              'min-w-[120px]',
              'min-w-[120px]',
              'min-w-[250px]',
              'min-w-[175px]',
            ]}
          />
          <TableBody>
            {!loading && books.length === 0 && (
              <TableRow className="!cursor-auto hover:!bg-transparent">
                <TableCell colSpan={5} className="text-center">
                  <Typography variant="body1" component="span">
                    No books found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {loading ? (
              <TableRow className="!cursor-auto hover:!bg-transparent">
                <TableCell colSpan={5} className="text-center">
                  <CircularProgress className="my-[10rem]" />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {books.map(({ id, reference, title, type, updatedAt, contributorsNames, status }) => (
                  <TableRow key={id} className="group" onDoubleClick={() => navigateToWork(id)}>
                    <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-table-border-alt)] group-hover:border-b-[var(--color-table-border-alt)] group-hover:border-l-[var(--color-table-border-alt)]">
                      {reference}
                    </TableCell>
                    <TableCell className={cellStyles}>{title}</TableCell>
                    <TableCell className={cellStyles}>{<Chip label={convertOptionToString(status)} />}</TableCell>
                    <TableCell className={cellStyles}>{convertOptionToString(type)}</TableCell>
                    <TableCell className={cellStyles}>{contributorsNames.join(', ')}</TableCell>
                    <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-table-border-alt)] group-hover:border-r-[var(--color-table-border-alt)] group-hover:border-b-[var(--color-table-border-alt)]">
                      <div className="flex items-center justify-between">
                        {convertUpdatedAtToFormattedDate(updatedAt)}{' '}
                        <ButtonGroup>
                          <IconButton onClick={() => navigateToWork(id)}>
                            <FileOpenIcon className="opacity-0 group-hover:opacity-100" />
                          </IconButton>
                        </ButtonGroup>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        count={pagesCount}
        color="primary"
        className="ml-auto"
        showFirstButton
        showLastButton
        onChange={(_, value) => onPageChange(value)}
        disabled={loading}
      />
    </>
  );
};
