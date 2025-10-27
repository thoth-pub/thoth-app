'use client';

import SearchIcon from '@mui/icons-material/Search';
import { type Control, type FieldValues } from 'react-hook-form';

import { FormFieldOption } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  AutocompleteField,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  InputAdornment,
  MultipleContentWrapper,
} from '@/src/shared/ui';

const { WORK_SERIES } = FORM_FIELDS;

type FormFieldsProps = {
  control: Control<FieldValues>;
  options: FormFieldOption[];
  isLoading?: boolean;
  isDeleteDisabled?: boolean;
  onChange: (value: string) => void;
  onDelete: () => void;
};

export const FormFields = (props: FormFieldsProps) => {
  const { control, options, isLoading = false, isDeleteDisabled = true, onChange, onDelete } = props;

  return (
    <MultipleContentWrapper>
      <ContentWrapper>
        <FormFieldLabel label={WORK_SERIES.label} id={WORK_SERIES.name} />
        <FormFieldWithControlsWrapper>
          <AutocompleteField
            freeSolo
            disableClearable
            name={WORK_SERIES.name}
            id={WORK_SERIES.name}
            control={control}
            options={options}
            onInputChange={(_, value) => onChange(value)}
            loading={isLoading}
            icon={
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            }
          />
          <DeleteButton disabled={isDeleteDisabled} onClick={onDelete} />
        </FormFieldWithControlsWrapper>
      </ContentWrapper>
    </MultipleContentWrapper>
  );
};
