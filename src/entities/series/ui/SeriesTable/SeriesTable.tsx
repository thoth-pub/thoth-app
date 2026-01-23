'use client';

import { Fragment } from 'react';

import { convertOptionToString, convertUpdatedAtToFormattedDate } from '@/src/shared';
import {
  ButtonGroup,
  CircularProgress,
  DeleteButton,
  EditButton,
  Pagination,
  TableBody,
  TableCell,
  TableFormWrapper,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';

import useDeleteSeries from '../../api/hooks/useDeleteSeries';
import { SeriesEntity } from '../../model/series.types';
import useSeriesesStateMachine from '../../store/hooks/useSeriesesStateMachine';

type SeriesTableProps = {
  seriesForm: Readonly<React.ReactNode>;
  loading: boolean;
  serieses: SeriesEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SeriesTable = (props: SeriesTableProps) => {
  const { seriesForm, loading, serieses, page, pagesCount, onPageChange } = props;

  const { activeSeries, edit } = useSeriesesStateMachine();

  const { deleteSeries } = useDeleteSeries();

  return (
    <>
      <TableWrapper>
        <TableHeader
          cells={['Name', 'Description', 'Type', 'ISSN', 'Updated At']}
          cellStyles={['w-[210px] pl-3', 'w-[210px]', 'w-[210px]', 'w-[110px]', 'w-[110px]']}
        />
        <TableBody>
          {!loading && serieses.length === 0 && (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={5} className="text-center">
                <Typography variant="body1" component="span">
                  No series found
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
                        <TableCell className="firstCell normal-case">{name}</TableCell>
                        <TableCell className="middleCell">{description}</TableCell>
                        <TableCell className="middleCell">{convertOptionToString(type)}</TableCell>
                        <TableCell className="middleCell">
                          {issnPrint && issnPrint.length > 0 ? issnPrint : issnDigital}
                        </TableCell>
                        <TableCell className="lastCell">
                          <div className="flex justify-between">
                            {convertUpdatedAtToFormattedDate(updatedAt)}
                            <ButtonGroup className="-mt-2">
                              <DeleteButton
                                onClick={() => deleteSeries(id)}
                                className="opacity-0 group-hover:opacity-100"
                              />
                              <EditButton
                                disabled={!!activeSeries}
                                onClick={() => {
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

export default SeriesTable;
