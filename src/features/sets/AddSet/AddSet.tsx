'use client';

import AddIcon from '@mui/icons-material/Add';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { Activity, useState } from 'react';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { type SetEntity, useCreateSet } from '@/src/entities/sets';
import { useSetStateMachine } from '@/src/entities/sets/store/set.store';
import { AddNewSetForm } from '@/src/entities/sets/ui/AddNewSetForm/AddNewSetForm';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants';
import { useEscapeKey } from '@/src/shared/hooks';
import type { TitleEntity } from '@/src/shared/types';
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

const AddSet = () => {
  const { activeEntity: activeSet, edit, finishEditing } = useSetStateMachine();
  const { userImprintsOptions } = useUser();
  const { isImprintEditable } = useActivePublisherPermissions();

  const { createSet } = useCreateSet();

  const [set, setSet] = useState(activeSet);

  const open = activeSet && isDefaultId(activeSet.id) ? true : false;

  useEscapeKey(finishEditing, open);

  const defaultSet: SetEntity = {
    id: appConfig.defaultId,
    titles: [],
    type: WorkTypes.enum.BookSet,
    updatedAt: '',
    imprintId: userImprintsOptions.length > 0 ? userImprintsOptions[0].value : '',
    status: WorkStatuses.enum.Forthcoming,
    edition: 1,
    volumesCount: 0,
    covers: [],
  };

  const submit = () => {
    if (!set || set.titles.length === 0) return;

    createSet({ data: set });
    finishEditing();
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
      <Modal open={open} onClose={finishEditing}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) uppercase">
              <TranslatedContent content="actions.addSet" />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={submit} disabled={!set || (set && set.titles.length === 0)} />
              <CloseButton onClose={finishEditing} />
            </div>
          </div>
          <Activity mode={set ? 'visible' : 'hidden'}>
            {set && (
              <AddNewSetForm
                set={set}
                imprintOptions={userImprintsOptions}
                isImprintEditable={isImprintEditable}
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
