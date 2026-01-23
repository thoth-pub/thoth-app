'use client';

import EditSquareIcon from '@mui/icons-material/EditSquare';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import TranslateIcon from '@mui/icons-material/Translate';

import { WorkStatusChip } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { convertOptionToString, convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import {
  ButtonGroup,
  IconButton,
  MarkdownRenderer,
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
  onCreateNewEdition: (work: WorkEntity) => void;
  onCreateTranslation: (work: WorkEntity) => void;
};

export const WorksTable = (props: WorksTableProps) => {
  const { loading, works, page, pagesCount, onPageChange, navigateToWork, onCreateNewEdition, onCreateTranslation } =
    props;

  return (
    <>
      <TableWrapper>
        <TableHeader
          cells={['ID', 'Title', 'Status', 'Type', 'Contributors', 'Updated At']}
          cellStyles={[
            'min-w-[90px] pl-3',
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
              <TableCell colSpan={6} className="text-center">
                <Typography variant="body1" component="span">
                  No books found
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {loading ? (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={6} className="text-center">
                <CircularProgress className="my-[10rem]" />
              </TableCell>
            </TableRow>
          ) : (
            <>
              {works.map((work) => (
                <TableRow key={work.id} className="group" onDoubleClick={() => navigateToWork(work.id)}>
                  <TableCell className="firstCell">{work.reference}</TableCell>
                  <TableCell className="middleCell">
                    <MarkdownRenderer markdown={getMainTitle(work.titles).title} />
                  </TableCell>
                  <TableCell className="middleCell">
                    <WorkStatusChip status={work.status} />
                  </TableCell>
                  <TableCell className="middleCell">{convertOptionToString(work.type)}</TableCell>
                  <TableCell className="middleCell">{work.contributorsNames.join(', ')}</TableCell>
                  <TableCell className="lastCell">
                    <div className="flex items-center justify-between">
                      {convertUpdatedAtToFormattedDate(work.updatedAt)}{' '}
                      <ButtonGroup>
                        <IconButton onClick={() => onCreateNewEdition(work)}>
                          <PlusOneIcon className="opacity-0 group-hover:opacity-100" />
                        </IconButton>
                        <IconButton onClick={() => onCreateTranslation(work)}>
                          <TranslateIcon className="opacity-0 group-hover:opacity-100" />
                        </IconButton>
                        <IconButton onClick={() => navigateToWork(work.id)}>
                          <EditSquareIcon className="opacity-0 group-hover:opacity-100" />
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
