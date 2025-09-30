'use client';

import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { type Control } from 'react-hook-form';

import { useInstitutions } from '@/src/entities/institution';
import { appConfig, convertEntityToSelectFieldOptions } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AutocompleteField,
  DeleteButton,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputAdornment,
  InputLabel,
} from '@/src/shared/ui';

import type { AffiliationsForm } from '../../model/affiliation.types';

const { AFFILIATION, POSITION } = FORM_FIELDS;

type FormFieldProps = {
  control: Control<AffiliationsForm>;
  affiliationFieldName: string;
  positionFieldName: string;
  onRemove: () => void;
};

export const FormField = ({ control, affiliationFieldName, positionFieldName, onRemove }: FormFieldProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { institutions = [], loading } = useInstitutions({ filter: debouncedValue });

  const options = convertEntityToSelectFieldOptions(institutions, 'name');

  return (
    <>
      <FormFieldWrapper>
        <InputLabel>{AFFILIATION.label}</InputLabel>
        <FormFieldWithControlsWrapper>
          <AutocompleteField
            freeSolo
            disableClearable
            name={affiliationFieldName}
            control={control}
            options={options}
            className="pl-[1.25rem]"
            onInputChange={(_, value) => setSearchValue(value)}
            loading={loading}
            icon={
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            }
          />
          <DeleteButton onDelete={onRemove} />
        </FormFieldWithControlsWrapper>
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{POSITION.label}</InputLabel>
        <FormTextField className="pl-[1.25rem]" fullWidth name={positionFieldName} control={control} />
      </FormFieldWrapper>
    </>
  );
};
