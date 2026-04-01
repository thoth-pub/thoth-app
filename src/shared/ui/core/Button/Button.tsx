import Button, { type ButtonProps } from '@mui/material/Button';

export type { ButtonProps };

const ButtonComponent = ({ children, ...props }: ButtonProps) => {
  return <Button {...props}>{children}</Button>;
};

export default ButtonComponent;
