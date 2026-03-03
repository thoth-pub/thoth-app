'use client';

import type { Control, FieldValues } from 'react-hook-form';

import type { ContributionBiographyForm } from '@/src/entities/contribution/model/contribution.types';
import type { WorkAbstractsForm, WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { languageOptionsAlt } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { AutocompleteField, TranslatedContent, Typography } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type LanguageFieldProps = {
  control: Control<WorkAbstractsForm> | Control<WorkTitlesForm> | Control<ContributionBiographyForm>;
  languageFieldName: string;
  className?: string;
};

const LanguageField = (props: LanguageFieldProps) => {
  const { control, languageFieldName, className } = props;

  return (
    <div className={mergeStyles('flex grow-0', className)}>
      <Typography color="primary" className="mt-0.75 mr-1 font-semibold xl:mt-auto">
        <TranslatedContent content="language.label" namespace={NAMESPACES.enum.forms} />
      </Typography>
      <AutocompleteField
        control={control as unknown as Control<FieldValues>}
        name={languageFieldName}
        options={languageOptionsAlt}
        variant="standard"
        className="min-w-52"
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

export default LanguageField;
