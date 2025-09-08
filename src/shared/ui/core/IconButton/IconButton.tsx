import IconButton, { type IconButtonProps } from '@mui/material/IconButton';

const IconButtonComponent = ({ children, ...props }: IconButtonProps) => {
  return <IconButton {...props}>{children}</IconButton>;
};

export default IconButtonComponent;
