'use client';

import { Fragment } from 'react';

import { convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import {
  CircularProgress,
  Pagination,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';

import { SetEntity } from '../../model/set.types';

type SetsTableProps = {
  // seriesForm: Readonly<React.ReactNode>;
  loading: boolean;
  sets: SetEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SetsTable = (props: SetsTableProps) => {
  const { loading, sets, page, pagesCount, onPageChange } = props;

  // const { activeSeries, edit } = useSeriesesStateMachine();

  // const { deleteSeries } = useDeleteSeries();

  return (
    <>
      <TableWrapper>
        <TableHeader cells={['Name', 'Updated At']} cellStyles={['w-[210px] pl-3', 'w-[110px]']} />
        <TableBody>
          {!loading && sets.length === 0 && (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={2} className="text-center">
                <Typography variant="body1" component="span">
                  No series found
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {loading ? (
            <TableRow className="!cursor-auto hover:!bg-transparent">
              <TableCell colSpan={2} className="text-center">
                <CircularProgress className="my-[10rem]" />
              </TableCell>
            </TableRow>
          ) : (
            <>
              {sets.map(
                ({
                  id,
                  titles,
                  // type,
                  // issnPrint,
                  // issnDigital,
                  // description,
                  updatedAt,
                  // imprintId,
                  // imprintName,
                  // url,
                  // issues,
                }) => (
                  <Fragment key={id}>
                    {/* {activeSeries && activeSeries.id === id ? (
                      <TableFormWrapper colSpan={5}>{seriesForm}</TableFormWrapper>
                    ) : ( */}
                    <TableRow key={id} className="group">
                      <TableCell className="firstCell">{getMainTitle(titles).title}</TableCell>
                      {/* <TableCell className="middleCell">{description}</TableCell> */}
                      {/* <TableCell className="middleCell">{convertOptionToString(type)}</TableCell> */}
                      {/* <TableCell className="middleCell">
                        <Typography>{issnPrint && issnPrint.length > 0 ? issnPrint : issnDigital}</Typography>
                      </TableCell> */}
                      <TableCell className="lastCell">
                        <div className="flex justify-between">
                          <Typography>{convertUpdatedAtToFormattedDate(updatedAt)}</Typography>
                          {/* <ButtonGroup>
                            <DeleteButton
                                onClick={() => deleteSeries(id)}
                                className="opacity-0 group-hover:opacity-100"
                              />
                            <EditButton
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
                          </ButtonGroup> */}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* )} */}
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

export default SetsTable;
