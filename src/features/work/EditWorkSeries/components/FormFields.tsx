'use client';

import SearchIcon from '@mui/icons-material/Search';
import { useEffect } from 'react';
import { type Control, type FieldValues, UseFormSetValue, useWatch } from 'react-hook-form';

import { useSeries } from '@/src/entities/series';
import { FORM_FIELDS } from '@/src/shared/constants';
import type { FormFieldOption } from '@/src/shared/interfaces';
import {
  AutocompleteField,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  InputAdornment,
  MultipleContentWrapper,
} from '@/src/shared/ui';

type FormFieldsProps = {
  control: Control<FieldValues>;
  options: FormFieldOption[];
  isLoading?: boolean;
  isDeleteDisabled?: boolean;
  deleteLoading?: boolean;
  children?: Readonly<React.ReactNode>;
  onChange: (value: string) => void;
  onDelete: () => void;
  setValue: UseFormSetValue<FieldValues>;
};

const { WORK_SERIES, ISSUE_ORDINAL } = FORM_FIELDS;

export const FormFields = (props: FormFieldsProps) => {
  const {
    control,
    options,
    isLoading = false,
    isDeleteDisabled = true,
    deleteLoading = false,
    children,
    onChange,
    onDelete,
    setValue,
  } = props;

  const { value: selectedSeries } = useWatch({ control, name: WORK_SERIES.name });
  const { series } = useSeries({ seriesId: selectedSeries });

  const lastIssueOrdinal = [...(series?.issues ?? [])].sort((a, b) => a.ordinal - b.ordinal).at(-1)?.ordinal ?? 1;

  const defaultValue = lastIssueOrdinal > 1 ? lastIssueOrdinal + 1 : 1;

  useEffect(() => {
    setValue(ISSUE_ORDINAL.name, defaultValue);
  }, [defaultValue]);

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
          <DeleteButton disabled={isDeleteDisabled || deleteLoading} onClick={onDelete} />
        </FormFieldWithControlsWrapper>
      </ContentWrapper>
      <ContentWrapper>
        <FormFieldLabel label={ISSUE_ORDINAL.label} id={ISSUE_ORDINAL.name} />
        <FormTextField
          name={ISSUE_ORDINAL.name}
          control={control}
          id={ISSUE_ORDINAL.name}
          defaultValue={defaultValue}
        />
      </ContentWrapper>
      {children}
    </MultipleContentWrapper>
  );
};
