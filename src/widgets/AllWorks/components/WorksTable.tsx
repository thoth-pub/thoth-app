'use client';

import FileOpenIcon from '@mui/icons-material/FileOpen';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { convertOptionToString, convertUpdatedAtToFormattedDate } from '@/src/shared';
import {
  ButtonGroup,
  Chip,
  IconButton,
  Pagination,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';
import { CircularProgress } from '@/src/shared/ui';

type WorksTableProps = {
  loading: boolean;
  works: WorkEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
  navigateToWork: (id: string) => void;
};

export const WorksTable = (props: WorksTableProps) => {
  const { loading, works, page, pagesCount, onPageChange, navigateToWork } = props;

  return (
    <>
      <TableWrapper>
        <TableHeader
          cells={['ID', 'Title', 'Status', 'Type', 'Contributors', 'Updated At']}
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
          {!loading && works.length === 0 && (
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
              {works.map(({ id, reference, title, type, updatedAt, contributorsNames, status }) => (
                <TableRow key={id} className="group" onDoubleClick={() => navigateToWork(id)}>
                  <TableCell className="firstCell">{reference}</TableCell>
                  <TableCell className="middleCell">{title}</TableCell>
                  <TableCell className="middleCell">{<Chip label={convertOptionToString(status)} />}</TableCell>
                  <TableCell className="middleCell">{convertOptionToString(type)}</TableCell>
                  <TableCell className="middleCell">{contributorsNames.join(', ')}</TableCell>
                  <TableCell className="lastCell">
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
      </TableWrapper>
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
