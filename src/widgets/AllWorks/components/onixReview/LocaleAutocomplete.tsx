'use client';

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { languageOptionsAlt } from '@/src/shared/constants';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { TextField } from '@/src/shared/ui';

/**
 * The matches shown at once. Typing narrows the vocabulary; the control is for finding a locale, not for reading the
 * several hundred of them, and rendering them all on every keystroke is what made the old select slow to use.
 */
const SHOWN_MATCHES = 40;

const filterLocales = createFilterOptions<FormFieldOption>({ limit: SHOWN_MATCHES });

/** The label the app gives a Thoth locale code, or the code itself where the vocabulary has none. */
export const localeLabel = (code: string): string =>
  languageOptionsAlt.find(({ value }) => value === code)?.label ?? code;

type LocaleAutocompleteProps = {
  readonly id: string;
  /** The accessible name of the control: enough Work, contributor and field context to stand alone. */
  readonly label: string;
  /** The id of the question the control answers, where there is one. */
  readonly describedBy?: string;
  /** The Thoth locale code currently answered, if any. */
  readonly value: string | undefined;
  readonly error?: boolean;
  readonly helperText?: string;
  readonly onChange: (code: string | undefined) => void;
};

/**
 * One of Thoth's locales, found by typing any part of its name (#179 6036599101 B): the app's own locale vocabulary,
 * searched rather than scrolled, with the keyboard moving through the matches and Enter taking one. Nothing is
 * preselected; clearing the field takes the answer back.
 */
export const LocaleAutocomplete = ({
  id,
  label,
  describedBy,
  value,
  error = false,
  helperText,
  onChange,
}: LocaleAutocompleteProps) => {
  const selected = value === undefined ? null : (languageOptionsAlt.find((option) => option.value === value) ?? null);

  return (
    <Autocomplete<FormFieldOption, false, false, false>
      id={id}
      options={languageOptionsAlt}
      value={selected}
      onChange={(_event, option) => onChange(option?.value)}
      getOptionLabel={(option) => option.label}
      filterOptions={filterLocales}
      isOptionEqualToValue={(option, chosen) => option.value === chosen.value}
      autoHighlight
      openOnFocus
      size="small"
      className="max-w-md"
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          slotProps={{
            htmlInput: {
              ...params.inputProps,
              'aria-describedby':
                [describedBy, params.inputProps['aria-describedby']].filter(Boolean).join(' ') || undefined,
            },
          }}
        />
      )}
    />
  );
};
