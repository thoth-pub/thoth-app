'use client';

import { SeriesTable } from '@/src/entities/series';
import { AddSeries, EditSeries } from '@/src/features';
import { FormFieldOption, type QueryToken } from '@/src/shared';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type SeriesProps = {
  imprintOptions: FormFieldOption[];
  queryToken: QueryToken;
};

const Series = ({ imprintOptions, queryToken }: SeriesProps) => {
  return (
    <ContentSection title="Series">
      <SeriesTable
        queryToken={queryToken}
        seriesForm={<EditSeries />}
        footerContent={<AddSeries imprintOptions={imprintOptions} queryToken={queryToken} />}
      />
    </ContentSection>
  );
};

export default Series;
