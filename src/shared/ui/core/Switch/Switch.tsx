import { Switch as MuiSwitch, type SwitchProps } from '@mui/material';

export type { SwitchProps };

const Switch = (props: SwitchProps) => {
  return <MuiSwitch {...props} />;
};

export default Switch;
