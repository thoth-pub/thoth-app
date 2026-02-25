'use client';

import { SeriesList } from '@/src/entities/series';
import { EditSeries } from '@/src/features';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { SeriesHeader } from './SeriesHeader';
import { useSeriesList } from './useSeriesList';

const Series = () => {
  const {
    loading,
    isFetched,
    serieses,
    activePage,
    totalPagesCount,
    direction,
    orderBy,
    seriesType,
    searchValue,
    changePage,
    setSearchValue,
    changeSeriesType,
    changeDirection,
    changeOrderBy,
  } = useSeriesList();

  return (
    <>
      <SeriesHeader
        seriesType={seriesType}
        searchValue={searchValue}
        direction={direction}
        orderBy={orderBy}
        onSearch={setSearchValue}
        changeSeriesType={changeSeriesType}
        changeDirection={changeDirection}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection>
        <SeriesList
          loading={!isFetched || loading}
          serieses={serieses}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          seriesForm={<EditSeries />}
        />
      </ContentSection>
    </>
  );
};

export default Series;
