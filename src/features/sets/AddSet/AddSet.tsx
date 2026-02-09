'use client';

import AddIcon from '@mui/icons-material/Add';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { Activity, useState } from 'react';

import { type SetEntity, useCreateSet } from '@/src/entities/sets';
import useSetStateMachine from '@/src/entities/sets/store/hooks/useSetStateMachine';
import { AddNewSetForm } from '@/src/entities/sets/ui/AddNewSetForm/AddNewSetForm';
import { appConfig, FormFieldOption, isDefaultId, TitleEntity, WorkStatuses, WorkTypes } from '@/src/shared';
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

type AddSetProps = {
  imprintOptions: FormFieldOption[];
};

const AddSet = ({ imprintOptions }: AddSetProps) => {
  const { activeSet, edit, close } = useSetStateMachine();

  const { createSet } = useCreateSet();

  const [set, setSet] = useState(activeSet);

  const open = activeSet && isDefaultId(activeSet.id) ? true : false;

  const defaultSet: SetEntity = {
    id: appConfig.defaultId,
    titles: [],
    type: WorkTypes.enum.BookSet,
    updatedAt: '',
    imprintId: imprintOptions.length > 0 ? imprintOptions[0].value : '',
    status: WorkStatuses.enum.Forthcoming,
    edition: 1,
    volumesCount: 0,
  };

  const submit = () => {
    if (!set || set.titles.length === 0) return;

    createSet({ data: set });
    close();
  };

  const updateImprint = (imprintId: string) => {
    if (!set) return;

    setSet({ ...set, imprintId });
  };

  const updateTitles = (titles: TitleEntity[]) => {
    if (!set) return;

    setSet({
      ...set,
      titles,
    });
  };

  const deleteTitle = (titleId: string) => {
    if (!set) return;

    setSet({ ...set, titles: set.titles.filter((title) => title.id !== titleId) });
  };

  const editSet = () => {
    edit(defaultSet);
    setSet(defaultSet);
  };

  const actions = [
    {
      icon: <AddIcon color="primary" onClick={editSet} />,
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
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) uppercase">
              <TranslatedContent content="actions.addSet" />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={submit} disabled={!set || (set && set.titles.length === 0)} />
              <CloseButton onClose={close} />
            </div>
          </div>
          <Activity mode={set ? 'visible' : 'hidden'}>
            {set && (
              <AddNewSetForm
                set={set}
                imprintOptions={imprintOptions}
                onUpdateImprint={updateImprint}
                onUpdateTitles={updateTitles}
                onDeleteTitle={deleteTitle}
              />
            )}
          </Activity>
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default AddSet;
