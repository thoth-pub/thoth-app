'use client';

import AddIcon from '@mui/icons-material/Add';

import { SeriesTable, useSeriesStateMachine } from '@/src/entities/series';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { AddSeries, EditSeries } from '@/src/features';
import { appConfig, isDefaultId, SeriesType } from '@/src/shared';
import { Button } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

const defaultSeries: SeriesEntity = {
  id: appConfig.defaultId,
  name: '',
  issnPrint: '',
  issnDigital: '',
  type: SeriesType.enum.BookSeries,
  issues: [],
  imprintId: '',
  imprintName: '',
  url: '',
  description: '',
  updatedAt: '',
};

const Series = () => {
  const { activeSeries, edit, close } = useSeriesStateMachine();

  const isNewSeries = activeSeries && isDefaultId(activeSeries.id);

  return (
    <ContentSection title="Series">
      <SeriesTable
        seriesForm={<EditSeries />}
        footerContent={
          <Button startIcon={<AddIcon />} onClick={() => edit(defaultSeries)}>
            Add New Series
          </Button>
        }
      />
      {isNewSeries && <AddSeries />}
    </ContentSection>
  );
};

export default Series;
