'use client';

import type { Control } from 'react-hook-form';

import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { languageOptionsAlt } from '@/src/shared/constants/formFields';
import { AutocompleteField, Typography } from '@/src/shared/ui';

type LanguageFieldProps = {
  control: Control<WorkTitlesForm>;
  languageFieldName: string;
};

export const LanguageField = (props: LanguageFieldProps) => {
  const { control, languageFieldName } = props;
  return (
    <div className="flex grow-0 lg:ml-2">
      <Typography color="primary" className="mt-1 mr-1 font-semibold lg:mt-auto">
        Language
      </Typography>
      <AutocompleteField
        control={control}
        name={languageFieldName}
        options={languageOptionsAlt}
        variant="standard"
        className="min-w-[13rem]"
        sx={{
          marginTop: 'auto',
          position: 'relative',
          top: '1px',
          '& .MuiAutocomplete-input.MuiInputBase-input': {
            height: '1.5rem !important',
            padding: 0,
            color: 'var(--purple)',
            position: 'relative',
            top: '-1px',
            backgroundColor: 'transparent',
            '&::before, &::after': {
              display: 'none',
            },
          },
          '& .MuiInputBase-root': {
            height: '1.5rem !important',
            padding: 0,
            backgroundColor: 'transparent !important',
            '&::before, &::after': {
              display: 'none',
            },
            '& .MuiSvgIcon-root ': {
              color: 'var(--purple)',
              position: 'relative',
              top: '-1px',
            },
          },
        }}
      />
    </div>
  );
};
