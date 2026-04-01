import Checkbox, { type CheckboxProps } from '@mui/material/Checkbox';

export type { CheckboxProps };

const CheckboxComponent = (props: CheckboxProps) => {
  return <Checkbox {...props} />;
};

export default CheckboxComponent;
