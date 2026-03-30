'use client';

import AddIcon from '@mui/icons-material/Add';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { useState } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { EditSeriesForm, useCreateSeries, useSeriesStateMachine } from '@/src/entities/series';
import type {
  SeriesDescriptionFormType,
  SeriesEntity,
  SeriesImprintFormType,
  SeriesIssnFormType,
  SeriesNameFormType,
  SeriesTypeFormType,
  SeriesUrlFormType,
} from '@/src/entities/series/model/series.types';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { SeriesType } from '@/src/shared/constants';
import { useEscapeKey } from '@/src/shared/hooks';
import {
  CloseButton,
  Modal,
  ModalWrapper,
  SpeedDial,
  SpeedDialActions,
  SubmitButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { isDefaultId } from '@/src/shared/utils';

const AddSeries = () => {
  const { activeEntity: activeSeries, edit, finishEditing } = useSeriesStateMachine();

  const [series, setSeries] = useState(activeSeries);
  const { userImprintsOptions } = useUser();
  const { createSeries } = useCreateSeries();
  const { isImprintEditable } = useActivePublisherPermissions();

  const open = activeSeries && isDefaultId(activeSeries.id) ? true : false;

  useEscapeKey(finishEditing, open);

  const defaultSeries: SeriesEntity = {
    id: appConfig.defaultId,
    name: '',
    issnPrint: '',
    issnDigital: '',
    type: SeriesType.enum.BookSeries,
    issues: [],
    imprintId: userImprintsOptions.length > 0 ? userImprintsOptions[0].value : '',
    imprintName: userImprintsOptions.length > 0 ? userImprintsOptions[0].label : '',
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
    finishEditing();
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

    const imprintOption = userImprintsOptions.find((option) => option.value === data.imprintId);

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
      <Modal open={open} onClose={finishEditing}>
        <ModalWrapper onClickAway={finishEditing}>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) uppercase">
              <TranslatedContent content="actions.addSeries" />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={submit} />
              <CloseButton onClose={finishEditing} />
            </div>
          </div>
          {series && (
            <EditSeriesForm
              borderTransparent
              imprintOptions={userImprintsOptions}
              type={series.type}
              name={series.name}
              issnPrint={series.issnPrint}
              issnDigital={series.issnDigital}
              imprint={series.imprintName}
              url={series.url}
              description={series.description}
              isImprintEditable={isImprintEditable}
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
