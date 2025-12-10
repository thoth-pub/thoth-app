'use client';

import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import TranslateIcon from '@mui/icons-material/Translate';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';

import { ROUTES } from '@/src/shared/constants';
import { Link, SpeedDial, SpeedDialActions } from '@/src/shared/ui';

type WorksSpeedDialProps = {
  onUpload: () => void;
  onCreateTranslation: () => void;
  onCreateNewEdition: () => void;
};

export const WorksSpeedDial = (props: WorksSpeedDialProps) => {
  const { onUpload, onCreateTranslation, onCreateNewEdition } = props;

  const actions = [
    {
      icon: <PlusOneIcon color="primary" onClick={onCreateNewEdition} />,
      name: 'Reissue',
    },
    {
      icon: <TranslateIcon color="primary" onClick={onCreateTranslation} />,
      name: 'Translation',
    },
    {
      icon: <FileUploadIcon color="primary" onClick={onUpload} />,
      name: 'Upload',
    },
    {
      icon: (
        <Link href={ROUTES.NEW_WORK}>
          <AddIcon color="primary" />
        </Link>
      ),
      name: 'Create',
    },
  ];

  return (
    <SpeedDial
      ariaLabel="Works SpeedDial"
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
        <SpeedDialActions
          key={action.name}
          icon={action.icon}
          slotProps={{
            tooltip: {
              open: true,
              title: action.name,
            },
          }}
        />
      ))}
    </SpeedDial>
  );
};
