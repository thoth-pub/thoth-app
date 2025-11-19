'use client';

import { Link, SpeedDial, SpeedDialActions } from '@/src/shared/ui';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AddIcon from '@mui/icons-material/Add';
import { ROUTES } from '@/src/shared/constants';

type WorksSpeedDialProps = {
  onUpload: () => void;
};

export const WorksSpeedDial = (props: WorksSpeedDialProps) => {
  const { onUpload } = props;

  const actions = [
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
      name: 'Create new',
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
        <SpeedDialActions key={action.name} icon={action.icon} />
      ))}
    </SpeedDial>
  );
};
