import ButtonGroup, { ButtonGroupProps } from '@mui/material/ButtonGroup';

const ButtonGroupComponent = ({ children, ...props }: ButtonGroupProps) => {
  return <ButtonGroup {...props}>{children}</ButtonGroup>;
};

export default ButtonGroupComponent;
