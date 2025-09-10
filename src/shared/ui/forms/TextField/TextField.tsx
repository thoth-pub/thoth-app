'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

export type TextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  options?: FormFieldOption[];
} & BaseFieldProps<T> &
  TextFieldProps;

const TextFieldComponent = <T extends FieldValues>({
  control,
  name,
  defaultValue,
  options,
  min,
  ...restProps
}: TextFieldComponentProps<T>) => {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          error={!!error}
          helperText={error ? error.message : null}
          slotProps={{ htmlInput: { min } }}
          {...restProps}
        >
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
