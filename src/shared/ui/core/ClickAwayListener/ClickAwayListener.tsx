import ClickAwayListener, { type ClickAwayListenerProps } from '@mui/material/ClickAwayListener';

const ClickAwayListenerComponent = ({ children, ...props }: ClickAwayListenerProps) => {
  return <ClickAwayListener {...props}>{children}</ClickAwayListener>;
};

export default ClickAwayListenerComponent;
