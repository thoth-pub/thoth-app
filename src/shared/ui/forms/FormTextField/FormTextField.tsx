'use client';

import { InputAdornment } from '@mui/material';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { appConfig } from '@/src/shared';
import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import TextField, { type TextFieldProps } from '../../core/TextField/TextField';

export type FormTextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  options?: FormFieldOption[];
  isDoiField?: boolean;
  isUrlField?: boolean;
  isRorField?: boolean;
} & BaseFieldProps<T> &
  TextFieldProps;

const { protocolPrefix, doiPrefix, rorPrefix } = appConfig.validations;

const FormTextFieldComponentProps = <T extends FieldValues>(props: FormTextFieldComponentProps<T>) => {
  const {
    control,
    name,
    defaultValue,
    options,
    min,
    isHelperTextVisible = false,
    helperText,
    isDoiField = false,
    isUrlField = false,
    isRorField = false,
    ...restProps
  } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
        <TextField
          {...field}
          error={!!error}
          helperText={error ? error.message : helperText}
          value={value.replace(doiPrefix, '').replace(protocolPrefix, '')}
          onChange={(e) => {
            if (isDoiField && !e.target.value.startsWith(doiPrefix) && e.target.value.length > 0) {
              return onChange(doiPrefix + e.target.value);
            }

            if (isUrlField && !e.target.value.startsWith(protocolPrefix) && e.target.value.length > 0) {
              return onChange(protocolPrefix + e.target.value);
            }

            if (isRorField && !e.target.value.startsWith(rorPrefix) && e.target.value.length > 0) {
              return onChange(rorPrefix + e.target.value);
            }

            onChange(e.target.value);
          }}
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
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {isUrlField && protocolPrefix}
                  {isDoiField && doiPrefix}
                </InputAdornment>
              ),
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
