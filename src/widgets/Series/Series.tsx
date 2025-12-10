'use client';

import { SeriesTable } from '@/src/entities/series';
import { EditSeries } from '@/src/features';
import { FormFieldOption } from '@/src/shared';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { SeriesHeader } from './SeriesHeader';
import { useSeriesTable } from './useSeriesTable';

type SeriesProps = {
  imprintOptions: FormFieldOption[];
};

const Series = ({ imprintOptions }: SeriesProps) => {
  const {
    loading,
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
  } = useSeriesTable();

  return (
    <>
      <SeriesHeader
        imprintOptions={imprintOptions}
        seriesType={seriesType}
        searchValue={searchValue}
        direction={direction}
        orderBy={orderBy}
        onSearch={setSearchValue}
        changeSeriesType={changeSeriesType}
        changeDirection={changeDirection}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection title="Series">
        <SeriesTable
          loading={loading}
          serieses={serieses}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          seriesForm={<EditSeries imprintOptions={imprintOptions} />}
        />
      </ContentSection>
    </>
  );
};

export default Series;
