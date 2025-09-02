'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { type Control, Controller, type FieldValues, Path, PathValue } from 'react-hook-form';

import type { FormFieldName, FormFieldOption } from '@/interfaces';

export type TextFieldComponentProps<T extends FieldValues> = {
  control: Control<T>;
  name: FormFieldName;
  defaultValue?: PathValue<T, Path<T>>;
  options?: FormFieldOption[];
} & TextFieldProps;

const TextFieldComponent = <T extends FieldValues>({
  control,
  name,
  defaultValue,
  options,
  ...restProps
}: TextFieldComponentProps<T>) => {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field, fieldState: { error } }) => (
        <TextField {...field} error={!!error} helperText={error ? error.message : null} {...restProps}>
          {options &&
            options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
        </TextField>
      )}
    />
  );
};

export default TextFieldComponent;
