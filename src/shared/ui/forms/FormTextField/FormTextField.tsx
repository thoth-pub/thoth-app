'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import TextField, { type TextFieldProps } from '../../core/TextField/TextField';

export type FormTextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  options?: FormFieldOption[];
} & BaseFieldProps<T> &
  TextFieldProps;

const FormTextFieldComponentProps = <T extends FieldValues>(props: FormTextFieldComponentProps<T>) => {
  const { control, name, defaultValue, options, min, isHelperTextVisible = false, helperText, ...restProps } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          error={!!error}
          helperText={error ? error.message : helperText}
          slotProps={{
            htmlInput: { min },
            select: {
              MenuProps: {
                sx: {
                  maxHeight: '300px',
                },
              },
            },
            formHelperText: {
              hidden: !isHelperTextVisible,
            },
          }}
          options={options}
          {...restProps}
        />
      )}
    />
  );
};

export default FormTextFieldComponentProps;
