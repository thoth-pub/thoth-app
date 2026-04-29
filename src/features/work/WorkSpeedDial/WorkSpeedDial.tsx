'use client';

import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import TranslateIcon from '@mui/icons-material/Translate';
import CircularProgress from '@mui/material/CircularProgress';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { MetadataModal } from '@/src/entities/metadata';
import {
  useCreateNewWorkEdition,
  useCreateWorkTranslation,
  useWork,
  // useWorkRecommendations,
  useWorkSet,
} from '@/src/entities/work';
import useDeleteWork from '@/src/entities/work/api/hooks/useDeleteWork';
import type { WorkId } from '@/src/entities/work/model/work.types';
// import { ANCHORS } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
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

// import DataIndicator from '@/src/shared/ui/core/DataIndicator/DataIndicator';
import { AddVolume } from './components/AddVolume';

type WorkSpeedDialProps = {
  workId: WorkId;
};

// const buttonItemStyle = {
//   minWidth: '10px',
//   minHeight: '10px',
//   height: '10px',
//   width: '10px',
//   boxShadow: 'none !important',
// };

// const { BASIC_DETAILS, DESCRIPTIONS, CONTRIBUTIONS, FUNDINGS } = ANCHORS;

type PendingAction = 'delete' | 'reissue' | 'translation' | 'extend';

const WORK_SPEEDDIAL_WARNINGS: Record<PendingAction, ReactNode> = {
  delete: <TranslatedContent content="deleteWorkWarning" namespace={NAMESPACES.enum.warnings} />,
  reissue: <TranslatedContent content="reissueWorkWarning" namespace={NAMESPACES.enum.warnings} />,
  translation: <TranslatedContent content="translateWorkWarning" namespace={NAMESPACES.enum.warnings} />,
  extend: <TranslatedContent content="extendWorkWarning" namespace={NAMESPACES.enum.warnings} />,
};

const WorkSpeedDial = (props: WorkSpeedDialProps) => {
  const { workId } = props;

  const [openAddVolume, setOpenAddVolume] = useState(false);
  const [openMetaDialog, setOpenMetaDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // const {
  //   isAllInformationFilled,
  //   isEmpty,
  //   isBasicDetailsSectionEmpty,
  //   isBasicDetailsSectionFilled,
  //   isDescriptionsSectionEmpty,
  //   isDescriptionsSectionFilled,
  //   isContributionsEmpty,
  //   isContributionsRequired,
  //   isFundingsEmpty,
  //   isFundingsRequired,
  // } = useWorkRecommendations({ workId });
  const { work } = useWork(workId);
  const { workSet } = useWorkSet(workId);
  const { createNewWorkEdition, loading: isEditionPending } = useCreateNewWorkEdition();
  const { createWorkTranslation, loading: isTranslationPending } = useCreateWorkTranslation();
  const { deleteWork, loading: isDeletePending } = useDeleteWork({});

  const isActionPending = isEditionPending || isTranslationPending || isDeletePending;

  const requestAction = (action: PendingAction) => {
    if (isActionPending) return;
    if (action === 'extend' && workSet.length > 0) return;

    setPendingAction(action);
  };

  const cancelPendingAction = () => setPendingAction(null);

  const confirmPendingAction = () => {
    if (!pendingAction) return;

    switch (pendingAction) {
      case 'delete':
        deleteWork(workId);
        break;
      case 'reissue':
        createNewWorkEdition(work);
        break;
      case 'translation':
        createWorkTranslation(work);
        break;
      case 'extend':
        setOpenAddVolume(true);
        break;
    }

    setPendingAction(null);
  };

  const actions = [
    {
      icon: (
        <SaveAltIcon
          color={isActionPending ? 'disabled' : 'primary'}
          onClick={() => !isActionPending && setOpenMetaDialog(true)}
        />
      ),
      name: 'metadata',
    },
    // {
    //   icon: (
    //     <DataIndicator
    //       isEmpty={isEmpty}
    //       isValid={isAllInformationFilled}
    //       sx={{ boxShadow: 'none !important' }}
    //       component="span"
    //     />
    //   ),
    //   name: 'Recommendations',
    // },
    {
      icon: (
        <DeleteOutlineIcon
          color={isActionPending ? 'disabled' : 'primary'}
          onClick={() => requestAction('delete')}
        />
      ),
      name: 'delete',
    },
    {
      icon: (
        <PlusOneIcon color={isActionPending ? 'disabled' : 'primary'} onClick={() => requestAction('reissue')} />
      ),
      name: 'reissue',
    },
    {
      icon: (
        <TranslateIcon
          color={isActionPending ? 'disabled' : 'primary'}
          onClick={() => requestAction('translation')}
        />
      ),
      name: 'translation',
    },
  ];

  if (workSet.length === 0) {
    actions.push({
      icon: (
        <AddToPhotosIcon
          color={isActionPending ? 'disabled' : 'primary'}
          onClick={() => requestAction('extend')}
        />
      ),
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
            // slotProps={{
            //   tooltip:
            //     action.name === 'Recommendations'
            //       ? {
            //           title: (
            //             <ul className="flex flex-col gap-2 p-0 text-black">
            //               <Typography variant="body2" component="li">
            //                 <a href={`#${BASIC_DETAILS}`} className="capitalize">
            //                   <DataIndicator
            //                     isEmpty={isBasicDetailsSectionEmpty}
            //                     isValid={isBasicDetailsSectionFilled}
            //                     sx={{ ...buttonItemStyle }}
            //                   />
            //                   <TranslatedContent content="core details" />
            //                 </a>
            //               </Typography>
            //               <Typography variant="body2" component="li">
            //                 <a href={`#${CONTRIBUTIONS}`}>
            //                   <DataIndicator
            //                     isEmpty={isContributionsEmpty}
            //                     isValid={!isContributionsRequired}
            //                     sx={{ ...buttonItemStyle }}
            //                   />
            //                   <TranslatedContent content="contributions" />
            //                 </a>
            //               </Typography>
            //               <Typography variant="body2" component="li">
            //                 <a href={`#${DESCRIPTIONS}`}>
            //                   <DataIndicator
            //                     isEmpty={isDescriptionsSectionEmpty}
            //                     isValid={isDescriptionsSectionFilled}
            //                     sx={{ ...buttonItemStyle }}
            //                   />
            //                   <TranslatedContent content="descriptions" />
            //                 </a>
            //               </Typography>
            //               <Typography variant="body2" component="li">
            //                 <a href={`#${FUNDINGS}`}>
            //                   <DataIndicator
            //                     isEmpty={isFundingsEmpty}
            //                     isValid={!isFundingsRequired}
            //                     sx={{ ...buttonItemStyle }}
            //                   />
            //                   <TranslatedContent content="funding" />
            //                 </a>
            //               </Typography>
            //             </ul>
            //           ),
            //         }
            //       : { open: true, title: <TranslatedContent content={action.name} /> },
            // }}
            slotProps={{
              tooltip: { open: true, title: <TranslatedContent content={action.name} /> },
            }}
          />
        ))}
      </SpeedDial>
      <AddVolume workId={workId} open={openAddVolume} onClose={() => setOpenAddVolume(false)} />
      <MetadataModal open={openMetaDialog} workId={workId} onClose={() => setOpenMetaDialog(false)} />

      <Modal open={pendingAction !== null} onClose={confirmPendingAction}>
        <ModalWrapper onClickAway={cancelPendingAction}>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) capitalize">
              <TranslatedContent content={pendingAction ?? ''} />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={confirmPendingAction} />
              <CloseButton onClose={cancelPendingAction} />
            </div>
          </div>
          <Typography className="pl-4">{pendingAction && WORK_SPEEDDIAL_WARNINGS[pendingAction]}</Typography>
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default WorkSpeedDial;
