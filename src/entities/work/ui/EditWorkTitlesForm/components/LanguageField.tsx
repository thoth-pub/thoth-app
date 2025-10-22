'use client';

import type { Control } from 'react-hook-form';

import { languageOptionsAlt } from '@/src/shared/constants/formFields';
import { AutocompleteField, Typography } from '@/src/shared/ui';

import type { WorkTitlesForm } from '../../../model/work.types';

type LanguageFieldProps = {
  control: Control<WorkTitlesForm>;
  languageFieldName: string;
};

export const LanguageField = (props: LanguageFieldProps) => {
  const { control, languageFieldName } = props;
  return (
    <div className="flex lg:ml-2">
      <Typography color="primary" className="mt-auto mr-1 font-semibold">
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
