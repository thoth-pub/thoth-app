'use client';

import { Fragment } from 'react';

import { convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import {
  ButtonGroup,
  CircularProgress,
  DeleteButton,
  EditButton,
  MarkdownRenderer,
  Pagination,
  TableBody,
  TableCell,
  TableFormWrapper,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';

import { useDeleteSet } from '../../api/hooks/useDeleteSet';
import { SetEntity } from '../../model/set.types';
import useSetStateMachine from '../../store/hooks/useSetStateMachine';

type SetsTableProps = {
  form: React.ReactNode;
  loading: boolean;
  sets: SetEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SetsTable = (props: SetsTableProps) => {
  const { form, loading, sets, page, pagesCount, onPageChange } = props;

  const { activeSet, edit } = useSetStateMachine();

  const { deleteSet } = useDeleteSet();

  return (
    <>
      <TableWrapper>
        <TableHeader cells={['Title', 'Updated At']} cellStyles={['w-[210px] pl-3', 'w-[110px]']} />
        <TableBody>
          {!loading && sets.length === 0 && (
            <TableRow className="cursor-auto! hover:bg-transparent!">
              <TableCell colSpan={2} className="text-center">
                <Typography variant="body1" component="span">
                  No sets found
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {loading ? (
            <TableRow className="cursor-auto! hover:bg-transparent!">
              <TableCell colSpan={2} className="text-center">
                <CircularProgress className="my-[10rem]" />
              </TableCell>
            </TableRow>
          ) : (
            <>
              {sets.map(({ id, titles, type, updatedAt, imprintId, status, edition, volumesCount }) => (
                <Fragment key={id}>
                  {activeSet && activeSet.id === id ? (
                    <TableFormWrapper colSpan={5}>{form}</TableFormWrapper>
                  ) : (
                    <TableRow key={id} className="group">
                      <TableCell className="firstCell normal-case">
                        <MarkdownRenderer markdown={getMainTitle(titles).title} />
                      </TableCell>
                      <TableCell className="lastCell">
                        <div className="flex justify-between">
                          {convertUpdatedAtToFormattedDate(updatedAt)}
                          <ButtonGroup className="-mt-2">
                            <DeleteButton onClick={() => deleteSet(id)} className="opacity-0 group-hover:opacity-100" />
                            <EditButton
                              disabled={!!activeSet}
                              onClick={() => {
                                edit({
                                  id,
                                  titles,
                                  type,
                                  updatedAt,
                                  imprintId,
                                  status,
                                  edition,
                                  volumesCount,
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100"
                            />
                          </ButtonGroup>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
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

export default SetsTable;
