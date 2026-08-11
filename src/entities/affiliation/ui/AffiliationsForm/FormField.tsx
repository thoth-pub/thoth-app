'use client';

import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { type Control } from 'react-hook-form';

import { useInstitutions } from '@/src/entities/institution';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AutocompleteField,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputAdornment,
} from '@/src/shared/ui';
import { convertEntityToSelectFieldOptions, convertRorIdToText } from '@/src/shared/utils';

import type { AffiliationsForm } from '../../model/affiliation.types';

const { AFFILIATION, POSITION, CONTRIBUTOR_AFFILIATION_INSTITUTION } = FORM_FIELDS;

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
  const rorIdsByInstitutionId = new Map(institutions.map(({ id, ror }) => [id, ror]));

  return (
    <>
      <FormFieldWrapper>
        <FormFieldLabel label={CONTRIBUTOR_AFFILIATION_INSTITUTION.label} id={AFFILIATION.name} />
        <FormFieldWithControlsWrapper>
          <AutocompleteField
            freeSolo
            disableClearable
            name={affiliationFieldName}
            id={affiliationFieldName}
            control={control}
            options={options}
            onInputChange={(_, value) => setSearchValue(value)}
            loading={loading}
            filterOptions={(options) => options}
            renderOption={({ key: _key, ...optionProps }, option) => {
              const rorId = rorIdsByInstitutionId.get(option.value);

              return (
                <li key={option.value} {...optionProps} className={`${optionProps.className ?? ''} gap-2`}>
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {rorId && (
                    <span className="ml-auto shrink-0 text-sm text-(--color-typography)">
                      ROR: {convertRorIdToText(rorId)}
                    </span>
                  )}
                </li>
              );
            }}
            icon={
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            }
          />
          <DeleteButton onClick={onRemove} />
        </FormFieldWithControlsWrapper>
      </FormFieldWrapper>
      <FormFieldWrapper>
        <FormFieldLabel label={POSITION.label} id={POSITION.name} />
        <FormTextField id={positionFieldName} fullWidth name={positionFieldName} control={control} />
      </FormFieldWrapper>
    </>
  );
};
