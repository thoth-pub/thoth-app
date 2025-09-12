'use client';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { AutocompleteProps } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { Controller, type FieldValues, Path } from 'react-hook-form';

import type { BaseFieldProps, FormFieldOption } from '@/src/shared/interfaces';

import Autocomplete from '../../core/Autocomplete/Autocomplete';

export type AutocompleteFieldProps<T extends FieldValues> = {
  options: FormFieldOption[];
  placeholder: string;
} & Omit<AutocompleteProps<FormFieldOption, true, false, false>, 'options' | 'renderInput'> &
  BaseFieldProps<T>;

const AutocompleteField = <T extends FieldValues>(props: AutocompleteFieldProps<T>) => {
  const { defaultValue, control, name, placeholder, options, fullWidth = true, ...restProps } = props;

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
            fullWidth={fullWidth}
            options={options}
            id={name}
            popupIcon={<ArrowDropDownIcon />}
            renderInput={(params) => (
              <TextField {...params} placeholder={value && value.length > 0 ? undefined : placeholder} />
            )}
          />
        );
      }}
    />
  );
};

export default AutocompleteField;
