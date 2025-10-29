'use client';

import { Fragment, useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig, convertOptionToString, QueryToken } from '@/src/shared';
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
import useSerieses from '../../api/hooks/useSerieses';
import useSeriesesCount from '../../api/hooks/useSeriesesCount';
import useSeriesesStateMachine from '../../store/hooks/useSeriesesStateMachine';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

type SeriesTableProps = {
  seriesForm: Readonly<React.ReactNode>;
  queryToken: QueryToken;
  footerContent?: Readonly<React.ReactNode>;
};

const SeriesTable = (props: SeriesTableProps) => {
  const { footerContent, seriesForm, queryToken } = props;

  const { activeSeries, edit, close } = useSeriesesStateMachine();
  const { activePublisher } = usePublisherStateMachine();
  const publishers = activePublisher ? [activePublisher] : [];

  const [activePage, setActivePage] = useState(1);
  const { seriesCount } = useSeriesesCount(publishers);
  const { series, loading } = useSerieses({
    offset: (activePage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
  });
  const { deleteSeries } = useDeleteSeries({ queryToken });

  const totalPagesCount = Math.ceil(seriesCount / ITEMS_PER_PAGE);

  const changePage = (value: number) => {
    setActivePage(value);
  };

  return (
    <div className="overflow-auto">
      <Table className="border-separate">
        <TableHeader
          cells={['Name', 'Description', 'Type', 'ISSN']}
          cellStyles={['w-[210px]', 'w-[210px]', 'w-[210px]', 'w-[210px]']}
        />
        <TableBody>
          {!loading && series.length === 0 && (
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
              {series.map(
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
                      <TableFormWrapper colSpan={4}>{seriesForm}</TableFormWrapper>
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
                        <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                          <div className="flex justify-between">
                            <Typography>{issnPrint ? issnPrint : issnDigital}</Typography>
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
      <div className="flex items-center justify-between">
        {footerContent}
        <Pagination
          page={activePage}
          count={totalPagesCount}
          color="primary"
          showFirstButton
          showLastButton
          onChange={(_, value) => changePage(value)}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default SeriesTable;
