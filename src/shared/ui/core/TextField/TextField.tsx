import TextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

import type { FormFieldOption } from '@/src/shared/interfaces';

import MenuItem from '../MenuItem/MenuItem';

export type TextFieldProps = MuiTextFieldProps & { options?: FormFieldOption[] };

const TextFieldComponent = ({ options, ...props }: TextFieldProps) => {
  return (
    <TextField {...props}>
      {options &&
        options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
    </TextField>
  );
};

export default TextFieldComponent;
