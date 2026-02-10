'use client';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment } from '@mui/material';
import { useState } from 'react';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { appConfig, removePrefix } from '@/src/shared';
import { InputTypes } from '@/src/shared/constants/formFields';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import TextField, { type TextFieldProps } from '../../core/TextField/TextField';
import TranslatedContent from '../../core/TranslatedContent/TranslatedContent';

export type FormTextFieldComponentProps<T extends FieldValues> = {
  min?: number;
  step?: string;
  predefinedPrefix?: string;
  options?: FormFieldOption[];
  isDoiField?: boolean;
  isUrlField?: boolean;
  isRorField?: boolean;
  isOrcidField?: boolean;
  id?: string;
  isOptionsWithTranslations?: boolean;
} & BaseFieldProps<T> &
  TextFieldProps;

const { protocolPrefixHttps, protocolPrefixHttp, doiPrefix, rorPrefix, orcidPrefix } = appConfig.validations;

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
    type,
    predefinedPrefix = protocolPrefixHttps,
    isDoiField = false,
    isUrlField = false,
    isRorField = false,
    isOrcidField = false,
    isOptionsWithTranslations = false,
    children,
    ...restProps
  } = props;

  const [protocolPrefix, setProtocolPrefix] = useState(predefinedPrefix);
  const [showPassword, setShowPassword] = useState(false);

  const addPrefix = isDoiField || isUrlField || isRorField || isOrcidField;

  const isPasswordField = type === InputTypes.PASSWORD;

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
        <TextField
          {...field}
          error={!!error}
          helperText={
            error ? (
              error.message
            ) : (
              <TranslatedContent content={(helperText as string) ?? ''} namespace={NAMESPACES.enum.forms} />
            )
          }
          value={typeof value === 'string' ? removePrefix(value) : value}
          type={showPassword ? 'text' : type}
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

            if (isOrcidField && !e.target.value.startsWith(orcidPrefix) && e.target.value.length > 0) {
              return onChange(orcidPrefix + e.target.value);
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
                  {isOrcidField && orcidPrefix}
                </InputAdornment>
              ),
              endAdornment: isPasswordField && (
                <InputAdornment position="end" color="primary">
                  <IconButton
                    aria-label={showPassword ? 'hide the password' : 'display the password'}
                    onClick={handleClickShowPassword}
                  >
                    {showPassword ? <VisibilityOff color="primary" /> : <Visibility color="primary" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          options={options}
          isOptionsWithTranslations={isOptionsWithTranslations}
          {...restProps}
        >
          {children}
        </TextField>
      )}
    />
  );
};

export default FormTextFieldComponentProps;
