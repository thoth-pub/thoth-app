'use client';

import { Fragment } from 'react';

import { convertOptionToString, convertUpdatedAtToFormattedDate, QueryToken } from '@/src/shared';
import {
  ButtonGroup,
  CircularProgress,
  DeleteButton,
  EditButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableFormWrapper,
  TableHeader,
  TableRow,
  Typography,
} from '@/src/shared/ui';

import useDeleteSeries from '../../api/hooks/useDeleteSeries';
import { SeriesEntity } from '../../model/series.types';
import useSeriesesStateMachine from '../../store/hooks/useSeriesesStateMachine';

type SeriesTableProps = {
  seriesForm: Readonly<React.ReactNode>;
  queryToken: QueryToken;

  loading: boolean;
  serieses: SeriesEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SeriesTable = (props: SeriesTableProps) => {
  const { seriesForm, queryToken, loading, serieses, page, pagesCount, onPageChange } = props;

  const { activeSeries, edit, close } = useSeriesesStateMachine();

  const { deleteSeries } = useDeleteSeries({ queryToken });

  return (
    <div className="flex flex-col overflow-auto">
      <Table className="border-separate">
        <TableHeader
          cells={['Name', 'Description', 'Type', 'ISSN', 'Updated At']}
          cellStyles={['w-[210px]', 'w-[210px]', 'w-[210px]', 'w-[110px]', 'w-[110px]']}
        />
        <TableBody>
          {!loading && serieses.length === 0 && (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={3} className="text-center">
                <Typography variant="body1" component="span">
                  No series found
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {loading ? (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={3} className="text-center">
                <CircularProgress className="my-[10rem]" />
              </TableCell>
            </TableRow>
          ) : (
            <>
              {serieses.map(
                ({
                  id,
                  name,
                  type,
                  issnPrint,
                  issnDigital,
                  description,
                  updatedAt,
                  imprintId,
                  imprintName,
                  url,
                  issues,
                }) => (
                  <Fragment key={id}>
                    {activeSeries && activeSeries.id === id ? (
                      <TableFormWrapper colSpan={5}>{seriesForm}</TableFormWrapper>
                    ) : (
                      <TableRow key={id} className="group">
                        <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
                          {name}
                        </TableCell>
                        <TableCell className="border-1 border-r-0 border-l-0 border-transparent capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                          {description}
                        </TableCell>
                        <TableCell className="border-1 border-r-0 border-l-0 border-transparent capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                          {convertOptionToString(type)}
                        </TableCell>
                        <TableCell className="border-1 border-r-0 border-l-0 border-transparent capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                          <Typography>{issnPrint && issnPrint.length > 0 ? issnPrint : issnDigital}</Typography>
                        </TableCell>
                        <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                          <div className="flex justify-between">
                            <Typography>{convertUpdatedAtToFormattedDate(updatedAt)}</Typography>
                            <ButtonGroup>
                              <DeleteButton
                                onClick={() => deleteSeries(id)}
                                className="opacity-0 group-hover:opacity-100"
                              />
                              <EditButton
                                onClick={() => {
                                  close();
                                  edit({
                                    id,
                                    name,
                                    type,
                                    issnPrint,
                                    issnDigital,
                                    description,
                                    updatedAt,
                                    imprintId,
                                    imprintName,
                                    url,
                                    issues,
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
                ),
              )}
            </>
          )}
        </TableBody>
      </Table>
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
    </div>
  );
};

export default SeriesTable;
