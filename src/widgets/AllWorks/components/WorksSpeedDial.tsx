'use client';

import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import TranslateIcon from '@mui/icons-material/Translate';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import NextLink from 'next/link';

import { ROUTES } from '@/src/shared/constants';
import { Link, SpeedDial, SpeedDialActions, TranslatedContent } from '@/src/shared/ui';

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
      name: 'reissue',
    },
    {
      icon: <TranslateIcon color="primary" onClick={onCreateTranslation} />,
      name: 'translation',
    },
    {
      icon: <FileUploadIcon color="primary" onClick={onUpload} />,
      name: 'upload',
    },
    {
      icon: (
        <Link component={NextLink} href={ROUTES.NEW_WORK}>
          <AddIcon color="primary" />
        </Link>
      ),
      name: 'create',
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
              title: (
                <span className="capitalize">
                  <TranslatedContent content={`actions.${action.name}`} />
                </span>
              ),
            },
          }}
        />
      ))}
    </SpeedDial>
  );
};
