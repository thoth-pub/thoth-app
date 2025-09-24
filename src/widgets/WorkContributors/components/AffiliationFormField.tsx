'use client';

import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { type Control } from 'react-hook-form';

import type { AffiliationsForm } from '@/src/entities/contributor/model/contributor.validation';
import { useInstitutions } from '@/src/entities/institution';
import { appConfig, convertEntityToSelectFieldOptions, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AutocompleteField,
  DeleteButton,
  FormControlGroup,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputAdornment,
  InputLabel,
} from '@/src/shared/ui';

const { AFFILIATION, POSITION } = FORM_FIELDS;
const {
  FORM_FIELDS: { AFFILIATIONS: AFFILIATIONS_ID },
} = IDs;

type AffiliationFormFieldProps = {
  showControls: boolean;
  control: Control<AffiliationsForm>;
  affiliationFieldName: string;
  positionFieldName: string;
  onRemove: () => void;
};

export const AffiliationFormField = ({
  showControls,
  control,
  affiliationFieldName,
  positionFieldName,
  onRemove,
}: AffiliationFormFieldProps) => {
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
          {showControls && <FormControlGroup formId={AFFILIATIONS_ID} />}
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
