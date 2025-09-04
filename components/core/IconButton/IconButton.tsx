import IconButton, { type ButtonProps } from '@mui/material/Button';

const IconButtonComponent = ({ children, ...props }: ButtonProps) => {
  return <IconButton {...props}>{children}</IconButton>;
};

export default IconButtonComponent;
