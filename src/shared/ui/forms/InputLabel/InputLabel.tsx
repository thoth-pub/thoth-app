import { InputLabel as MuiInputLabel, type InputLabelProps } from '@mui/material';

export { type InputLabelProps };

const InputLabel = (props: InputLabelProps) => {
  return <MuiInputLabel {...props} />;
};

export default InputLabel;
