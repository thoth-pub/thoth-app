'use client';

import MenuItem from '@mui/material/MenuItem';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import TextField, { type TextFieldProps } from '../../core/TextField/TextField';

export type FormTextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  options?: FormFieldOption[];
} & BaseFieldProps<T> &
  TextFieldProps;

const FormTextFieldComponentProps = <T extends FieldValues>({
  control,
  name,
  defaultValue,
  options,
  min,
  ...restProps
}: FormTextFieldComponentProps<T>) => {
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
          slotProps={{
            htmlInput: { min },
            select: {
              MenuProps: {
                sx: {
                  maxHeight: '300px',
                },
              },
            },
          }}
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

export default FormTextFieldComponentProps;
