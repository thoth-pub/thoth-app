'use client';

import { Typography } from '@mui/material';
import { useState } from 'react';

import { EditSeriesForm, useSeriesStateMachine, useUpdateSeries } from '@/src/entities/series';
import { GET_SERIES } from '@/src/entities/series/model/series.schema';
import {
  SeriesDescriptionFormType,
  SeriesImprintFormType,
  SeriesIssnFormType,
  SeriesNameFormType,
  SeriesTypeFormType,
  SeriesUrlFormType,
} from '@/src/entities/series/model/series.types';
import type { FormFieldOption, QueryToken } from '@/src/shared';
import { CloseButton, MultipleContentWrapper, SubmitButton } from '@/src/shared/ui';

type EditSeriesProps = {
  queryToken: QueryToken;
  imprintOptions: FormFieldOption[];
};

const EditSeries = ({ queryToken, imprintOptions }: EditSeriesProps) => {
  const { activeSeries, close } = useSeriesStateMachine();

  const [series, setSeries] = useState(activeSeries);
  const { updateSeries, client } = useUpdateSeries({ queryToken });

  const done = () => {
    client.refetchQueries({ include: [GET_SERIES] });
    close();
  };

  const updateType = (data: SeriesTypeFormType) => {
    if (!series) return;

    const newData = { ...series, type: data.seriesType };

    updateSeries(newData);
    setSeries(newData);
  };

  const updateName = (data: SeriesNameFormType) => {
    if (!series) return;

    const newData = { ...series, name: data.seriesName };

    updateSeries(newData);
    setSeries(newData);
  };

  const updateIssn = (data: SeriesIssnFormType) => {
    if (!series) return;

    const newData = { ...series, issnPrint: data.issnPrint ?? '', issnDigital: data.issnDigital ?? '' };

    updateSeries(newData);
    setSeries(newData);
  };

  const updateImprint = (data: SeriesImprintFormType) => {
    if (!series) return;

    const imprintOption = imprintOptions.find((option) => option.value === data.imprintId);

    if (!imprintOption) return;

    const newData = { ...series, imprintId: data.imprintId, imprintName: imprintOption.label };

    updateSeries(newData);
    setSeries(newData);
  };

  const updateUrl = (data: SeriesUrlFormType) => {
    if (!series) return;

    const newData = { ...series, url: data.url ?? '' };

    updateSeries(newData);
    setSeries(newData);
  };

  const updateDescription = (data: SeriesDescriptionFormType) => {
    if (!series) return;

    const newData = { ...series, description: data.description ?? '' };

    updateSeries(newData);
    setSeries(newData);
  };

  if (!series) return null;

  return (
    <MultipleContentWrapper>
      <div className="flex justify-between">
        <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
          {series.name}
        </Typography>
        <div className="flex gap-2">
          <SubmitButton onClick={done} />
          <CloseButton onClose={close} />
        </div>
      </div>
      {series && (
        <EditSeriesForm
          isTableVariant
          borderTransparent
          imprintOptions={imprintOptions}
          type={series.type}
          name={series.name}
          issnPrint={series.issnPrint}
          issnDigital={series.issnDigital}
          imprint={series.imprintName}
          url={series.url}
          description={series.description}
          onTypeChange={updateType}
          onNameChange={updateName}
          onIssnChange={updateIssn}
          onImprintChange={updateImprint}
          onUrlChange={updateUrl}
          onDescriptionChange={updateDescription}
        />
      )}
    </MultipleContentWrapper>
  );
};

export default EditSeries;
