'use client';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { AutocompleteProps } from '@mui/material/Autocomplete';
import type { ReactNode } from 'react';
import { Controller, type FieldValues, Path } from 'react-hook-form';

import type { FormFieldOption } from '@/src/shared/interfaces';

import Autocomplete from '../../core/Autocomplete/Autocomplete';
import TextField from '../../core/TextField/TextField';
import { FormTextFieldComponentProps } from '../FormTextField/FormTextField';

export type AutocompleteFieldProps<T extends FieldValues> = {
  freeSolo?: boolean;
  options: FormFieldOption[];
  icon?: ReactNode;
} & Omit<AutocompleteProps<FormFieldOption, true, false | true, true | false>, 'options' | 'renderInput'> &
  FormTextFieldComponentProps<T>;

const AutocompleteField = <T extends FieldValues>(props: AutocompleteFieldProps<T>) => {
  const {
    defaultValue,
    control,
    name,
    options,
    fullWidth = true,
    icon,
    freeSolo = false,
    variant,
    ...restProps
  } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { onChange, value } }) => {
        return (
          <Autocomplete
            {...restProps}
            onChange={(_e, value) => onChange(value)}
            value={value}
            freeSolo={freeSolo}
            fullWidth={fullWidth}
            options={options}
            id={name}
            popupIcon={<ArrowDropDownIcon />}
            isOptionEqualToValue={(option: FormFieldOption, value: FormFieldOption) => option.value === value.value}
            renderInput={(params) => (
              <TextField
                {...params}
                variant={variant}
                slotProps={{ input: { ...params.InputProps, startAdornment: icon } }}
              />
            )}
          />
        );
      }}
    />
  );
};

export default AutocompleteField;
