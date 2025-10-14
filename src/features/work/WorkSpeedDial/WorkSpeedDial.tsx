import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';

import { SpeedDial, SpeedDialActions } from '@/src/shared/ui';

const actions = [{ icon: <DeleteOutlineIcon />, name: 'Delete' }];

const WorkSpeedDial = () => {
  return (
    <SpeedDial
      ariaLabel="Work SpeedDial"
      sx={{
        position: 'fixed',
        top: 20,
        right: 72,
        '& .MuiSpeedDial-fab': { color: 'secondary.main' },
      }}
      direction="down"
      icon={<SpeedDialIcon />}
    >
      {actions.map((action) => (
        <SpeedDialActions
          key={action.name}
          icon={action.icon}
          // slotProps={{
          //   tooltip: {
          //     title: action.name,
          //   },
          // }}
        />
      ))}
    </SpeedDial>
  );
};

export default WorkSpeedDial;
