'use client';

import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CardsList, Pagination, TranslatedContent, Typography } from '@/src/shared/ui';

import useDeleteSeries from '../../api/hooks/useDeleteSeries';
import { SeriesEntity } from '../../model/series.types';
import { useSeriesStateMachine } from '../../store/series.store';
import { SeriesCardListItem } from './components/SeriesCardListItem';

type SeriesListProps = {
  seriesForm: Readonly<React.ReactNode>;
  loading: boolean;
  serieses: SeriesEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SeriesList = (props: SeriesListProps) => {
  const { seriesForm, loading, serieses, page, pagesCount, onPageChange } = props;

  const { activeEntity: activeSeries, edit } = useSeriesStateMachine();

  const { deleteSeries } = useDeleteSeries();

  return (
    <>
      {serieses.length === 0 && !loading && (
        <Typography component="span" className="flex h-full min-h-100 items-center justify-center">
          <TranslatedContent content="emptyTable" namespace={NAMESPACES.enum.series} />
        </Typography>
      )}
      <CardsList items={serieses} loading={loading} backdropClassName="min-h-100" listClassName="min-h-100">
        {() => (
          <>
            {serieses.map((series) => (
              <SeriesCardListItem
                key={series.id}
                series={series}
                editing={activeSeries?.id === series.id}
                disabledControls={!!activeSeries}
                form={seriesForm}
                onEdit={edit}
                onDelete={deleteSeries}
              />
            ))}
          </>
        )}
      </CardsList>
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

export default SeriesList;
