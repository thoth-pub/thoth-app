'use client';

import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import TranslateIcon from '@mui/icons-material/Translate';
import CircularProgress from '@mui/material/CircularProgress';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { useState } from 'react';

import { MetadataModal } from '@/src/entities/metadata';
import {
  useCreateNewWorkEdition,
  useCreateWorkTranslation,
  useWork,
  useWorkRecommendations,
  useWorkSet,
} from '@/src/entities/work';
import useDeleteWork from '@/src/entities/work/api/hooks/useDeleteWork';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { ANCHORS } from '@/src/shared/constants';
import { SpeedDial, SpeedDialActions, TranslatedContent, Typography } from '@/src/shared/ui';
import DataIndicator from '@/src/shared/ui/core/DataIndicator/DataIndicator';

import { AddVolume } from './components/AddVolume';

type WorkSpeedDialProps = {
  workId: WorkId;
};

const buttonItemStyle = {
  minWidth: '10px',
  minHeight: '10px',
  height: '10px',
  width: '10px',
  boxShadow: 'none !important',
};

const { BASIC_DETAILS, DESCRIPTIONS, CONTRIBUTIONS, FUNDINGS } = ANCHORS;

const WorkSpeedDial = (props: WorkSpeedDialProps) => {
  const { workId } = props;

  const [openAddVolume, setOpenAddVolume] = useState(false);
  const [openMetaDialog, setOpenMetaDialog] = useState(false);

  const {
    isAllInformationFilled,
    isEmpty,
    isBasicDetailsSectionEmpty,
    isBasicDetailsSectionFilled,
    isDescriptionsSectionEmpty,
    isDescriptionsSectionFilled,
    isContributionsEmpty,
    isContributionsRequired,
    isFundingsEmpty,
    isFundingsRequired,
  } = useWorkRecommendations({ workId });
  const { work } = useWork(workId);
  const { workSet } = useWorkSet(workId);
  const { createNewWorkEdition, loading: isEditionPending } = useCreateNewWorkEdition();
  const { createWorkTranslation, loading: isTranslationPending } = useCreateWorkTranslation();
  const { deleteWork, loading: isDeletePending } = useDeleteWork({});

  const isActionPending = isEditionPending || isTranslationPending || isDeletePending;

  const onCreateNewEdition = () => {
    if (isActionPending) return;

    createNewWorkEdition(work);
  };

  const onCreateTranslation = () => {
    if (isActionPending) return;

    createWorkTranslation(work);
  };

  const onDeleteWork = () => {
    if (isActionPending) return;

    deleteWork(workId);
  };

  const addToSet = () => {
    if (isActionPending || workSet.length > 0) return;

    setOpenAddVolume(true);
  };

  const actions = [
    {
      icon: <SaveAltIcon color={isActionPending ? 'disabled' : 'primary'} onClick={() => !isActionPending && setOpenMetaDialog(true)} />,
      name: 'metadata',
    },
    {
      icon: (
        <DataIndicator
          isEmpty={isEmpty}
          isValid={isAllInformationFilled}
          sx={{ boxShadow: 'none !important' }}
          component="span"
        />
      ),
      name: 'Recommendations',
    },
    {
      icon: <DeleteOutlineIcon color={isActionPending ? 'disabled' : 'primary'} onClick={onDeleteWork} />,
      name: 'delete',
    },
    {
      icon: <PlusOneIcon color={isActionPending ? 'disabled' : 'primary'} onClick={onCreateNewEdition} />,
      name: 'reissue',
    },
    {
      icon: <TranslateIcon color={isActionPending ? 'disabled' : 'primary'} onClick={onCreateTranslation} />,
      name: 'translation',
    },
  ];

  if (workSet.length === 0) {
    actions.push({
      icon: <AddToPhotosIcon color={isActionPending ? 'disabled' : 'primary'} onClick={addToSet} />,
      name: 'extend',
    });
  }

  return (
    <>
      <SpeedDial
        ariaLabel="Work SpeedDial"
        sx={{
          position: 'fixed',
          bottom: 60,
          right: 40,
          '& .MuiSpeedDial-fab': { color: 'secondary.main' },
        }}
        direction="up"
        icon={isActionPending ? <CircularProgress size={24} color="inherit" /> : <SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialActions
            key={action.name}
            icon={action.icon}
            slotProps={{
              tooltip:
                action.name === 'Recommendations'
                  ? {
                      title: (
                        <ul className="flex flex-col gap-2 p-0 text-black">
                          <Typography variant="body2" component="li">
                            <a href={`#${BASIC_DETAILS}`} className="capitalize">
                              <DataIndicator
                                isEmpty={isBasicDetailsSectionEmpty}
                                isValid={isBasicDetailsSectionFilled}
                                sx={{ ...buttonItemStyle }}
                              />
                              <TranslatedContent content="core details" />
                            </a>
                          </Typography>
                          <Typography variant="body2" component="li">
                            <a href={`#${CONTRIBUTIONS}`}>
                              <DataIndicator
                                isEmpty={isContributionsEmpty}
                                isValid={!isContributionsRequired}
                                sx={{ ...buttonItemStyle }}
                              />
                              <TranslatedContent content="contributions" />
                            </a>
                          </Typography>
                          <Typography variant="body2" component="li">
                            <a href={`#${DESCRIPTIONS}`}>
                              <DataIndicator
                                isEmpty={isDescriptionsSectionEmpty}
                                isValid={isDescriptionsSectionFilled}
                                sx={{ ...buttonItemStyle }}
                              />
                              <TranslatedContent content="descriptions" />
                            </a>
                          </Typography>
                          <Typography variant="body2" component="li">
                            <a href={`#${FUNDINGS}`}>
                              <DataIndicator
                                isEmpty={isFundingsEmpty}
                                isValid={!isFundingsRequired}
                                sx={{ ...buttonItemStyle }}
                              />
                              <TranslatedContent content="funding" />
                            </a>
                          </Typography>
                        </ul>
                      ),
                    }
                  : { open: true, title: <TranslatedContent content={action.name} /> },
            }}
          />
        ))}
      </SpeedDial>
      <AddVolume workId={workId} open={openAddVolume} onClose={() => setOpenAddVolume(false)} />
      <MetadataModal open={openMetaDialog} workId={workId} onClose={() => setOpenMetaDialog(false)} />
    </>
  );
};

export default WorkSpeedDial;
