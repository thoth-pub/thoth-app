'use client';

import { Fragment } from 'react';

import { convertOptionToString, convertUpdatedAtToFormattedDate } from '@/src/shared';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
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
  TranslatedContent,
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
          cells={['name', 'description', 'type', 'issn', 'updated at']}
          cellStyles={[
            'w-[210px] pl-3 capitalize',
            'w-[210px] capitalize',
            'w-[210px] capitalize',
            'w-[110px] capitalize',
            'min-w-[200px] capitalize',
          ]}
        />
        <TableBody>
          {!loading && serieses.length === 0 && (
            <TableRow className="cursor-auto! hover:bg-transparent!">
              <TableCell colSpan={5} className="text-center">
                <Typography variant="body1" component="span">
                  <TranslatedContent content="emptyTable" namespace={NAMESPACES.enum.series} />
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {loading ? (
            <TableRow className="cursor-auto! hover:bg-transparent!">
              <TableCell colSpan={5} className="text-center">
                <CircularProgress className="my-40" />
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
