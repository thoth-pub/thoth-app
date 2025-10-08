'use client';

import { InputAdornment } from '@mui/material';
import { useState } from 'react';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { appConfig, removePrefix } from '@/src/shared';
import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import TextField, { type TextFieldProps } from '../../core/TextField/TextField';

export type FormTextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  step?: string;
  predefinedPrefix?: string;
  options?: FormFieldOption[];
  isDoiField?: boolean;
  isUrlField?: boolean;
  isRorField?: boolean;
  id?: string;
} & BaseFieldProps<T> &
  TextFieldProps;

const { protocolPrefixHttps, protocolPrefixHttp, doiPrefix, rorPrefix } = appConfig.validations;

const FormTextFieldComponentProps = <T extends FieldValues>(props: FormTextFieldComponentProps<T>) => {
  const {
    control,
    name,
    defaultValue,
    options,
    min,
    isHelperTextVisible = false,
    helperText,
    step,
    id,
    predefinedPrefix = protocolPrefixHttp,
    isDoiField = false,
    isUrlField = false,
    isRorField = false,
    ...restProps
  } = props;

  const [protocolPrefix, setProtocolPrefix] = useState(predefinedPrefix);

  const addPrefix = isDoiField || isUrlField || isRorField;

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
          value={typeof value === 'string' ? removePrefix(value) : value}
          onChange={(e) => {
            // TODO: refactor
            if (isDoiField && !e.target.value.startsWith(doiPrefix) && e.target.value.length > 0) {
              return onChange(doiPrefix + e.target.value);
            }

            if (isUrlField && e.target.value.length > 0) {
              const isHttps = e.target.value.startsWith(protocolPrefixHttps);
              const isHttp = e.target.value.startsWith(protocolPrefixHttp);

              if (isHttps) {
                setProtocolPrefix(protocolPrefixHttps);
                return onChange(e.target.value);
              }

              if (isHttp) {
                setProtocolPrefix(protocolPrefixHttp);
                return onChange(e.target.value);
              }

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
              hidden: !isHelperTextVisible && !error,
            },
            input: {
              inputProps: {
                step,
                id,
              },
              startAdornment: addPrefix && (
                <InputAdornment position="start">
                  {isUrlField && protocolPrefix}
                  {isDoiField && doiPrefix}
                  {isRorField && rorPrefix}
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
