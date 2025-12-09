'use client';

import AddIcon from '@mui/icons-material/Add';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { useState } from 'react';

import { EditSeriesForm, useCreateSeries, useSeriesesStateMachine } from '@/src/entities/series';
import type {
  SeriesDescriptionFormType,
  SeriesEntity,
  SeriesImprintFormType,
  SeriesIssnFormType,
  SeriesNameFormType,
  SeriesTypeFormType,
  SeriesUrlFormType,
} from '@/src/entities/series/model/series.types';
import { appConfig, FormFieldOption, isDefaultId, type QueryToken, SeriesType } from '@/src/shared';
import {
  CloseButton,
  Modal,
  ModalWrapper,
  SpeedDial,
  SpeedDialActions,
  SubmitButton,
  Typography,
} from '@/src/shared/ui';

type AddSeriesProps = {
  imprintOptions: FormFieldOption[];
  queryToken: QueryToken;
};

const AddSeries = ({ imprintOptions, queryToken }: AddSeriesProps) => {
  const { activeSeries, edit, close } = useSeriesesStateMachine();

  const [series, setSeries] = useState(activeSeries);
  const { createSeries } = useCreateSeries({ queryToken });

  const open = activeSeries && isDefaultId(activeSeries.id) ? true : false;

  const defaultSeries: SeriesEntity = {
    id: appConfig.defaultId,
    name: '',
    issnPrint: '',
    issnDigital: '',
    type: SeriesType.enum.BookSeries,
    issues: [],
    imprintId: imprintOptions[0].value,
    imprintName: imprintOptions[0].label,
    url: '',
    description: '',
    updatedAt: '',
  };

  const submit = () => {
    if (!series) return;

    const { type, name, issnPrint, issnDigital, imprintId, description, url } = series;

    createSeries({
      type,
      name,
      issnPrint,
      issnDigital,
      imprintId,
      description,
      url,
    });
    close();
  };

  const editSeries = () => {
    edit(defaultSeries);
    setSeries(defaultSeries);
  };

  const updateType = (data: SeriesTypeFormType) => {
    if (!series) return;

    setSeries({ ...series, type: data.seriesType });
  };

  const updateName = (data: SeriesNameFormType) => {
    if (!series) return;

    setSeries({ ...series, name: data.seriesName });
  };

  const updateIssn = (data: SeriesIssnFormType) => {
    if (!series) return;

    setSeries({ ...series, issnPrint: data.issnPrint ?? '', issnDigital: data.issnDigital ?? '' });
  };

  const updateImprint = (data: SeriesImprintFormType) => {
    if (!series) return;

    const imprintOption = imprintOptions.find((option) => option.value === data.imprintId);

    if (!imprintOption) return;

    setSeries({ ...series, imprintId: data.imprintId, imprintName: imprintOption.label });
  };

  const updateUrl = (data: SeriesUrlFormType) => {
    if (!series) return;

    setSeries({ ...series, url: data.url ?? '' });
  };

  const updateDescription = (data: SeriesDescriptionFormType) => {
    if (!series) return;

    setSeries({ ...series, description: data.description ?? '' });
  };

  const actions = [
    {
      icon: <AddIcon color="primary" onClick={editSeries} />,
      name: 'New',
    },
  ];

  return (
    <>
      <SpeedDial
        ariaLabel="Series SpeedDial"
        sx={{
          position: 'fixed',
          bottom: 60,
          right: 40,
          '& .MuiSpeedDial-fab': { color: 'secondary.main' },
        }}
        direction="up"
        icon={<SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialActions key={action.name} icon={action.icon} />
        ))}
      </SpeedDial>
      <Modal open={open} onClose={close}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
              Add New Series
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={submit} />
              <CloseButton onClose={close} />
            </div>
          </div>
          {series && (
            <EditSeriesForm
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
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default AddSeries;
