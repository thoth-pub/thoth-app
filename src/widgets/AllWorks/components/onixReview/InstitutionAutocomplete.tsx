'use client';

import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import ListSubheader from '@mui/material/ListSubheader';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { onixSearchedInstitutionAnswer } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import type { OnixInstitutionCandidate } from '@/src/shared/types';
import { TextField } from '@/src/shared/ui';
import { canonicaliseDoi, canonicaliseRor } from '@/src/shared/utils/validations';

import type { OnixReviewOption } from './reviewModel';

/** The fewest characters that search Thoth's institutions; fewer only narrow the suggestions. */
export const INSTITUTION_SEARCH_MIN_LENGTH = 3;

/** How long typing must pause before Thoth is searched, so that one search follows one burst of typing. */
export const INSTITUTION_SEARCH_DEBOUNCE_MS = 300;

/** An institution Thoth's institution search returned, as the review's search reads it. */
export type InstitutionSearchResult = OnixInstitutionCandidate;

type Group = 'SUGGESTED' | 'SEARCHED' | 'OMIT';

type PickerOption =
  | { readonly kind: 'ANSWER'; readonly group: Group; readonly key: string; readonly label: string }
  /** What the search says while it has no institutions to show: never something to choose. */
  | { readonly kind: 'STATUS'; readonly group: 'SEARCHED'; readonly key: string; readonly label: string };

type SearchState =
  | { readonly kind: 'IDLE' }
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'FAILED' }
  | { readonly kind: 'DONE'; readonly results: readonly InstitutionSearchResult[] };

/** Text as the picker compares it: without case, diacritics or repeated spacing. */
const folded = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Whether a searched institution may be the one the source declares (thoth-app#289): the same rule the resolver holds
 * every suggestion and every searched answer to. An institution of another ROR or FundRef DOI is never offered; the
 * resolver refuses it besides, whatever is offered here.
 */
export const declaredIdentityAllows = (
  { declaredRor, declaredDoi }: { readonly declaredRor: string; readonly declaredDoi: string },
  { ror, doi }: Pick<InstitutionSearchResult, 'ror' | 'doi'>,
): boolean =>
  (declaredRor.length === 0 || ror.length === 0 || canonicaliseRor(ror) === declaredRor) &&
  (declaredDoi.length === 0 || doi.length === 0 || canonicaliseDoi(doi).toLowerCase() === declaredDoi.toLowerCase());

const resultLabel = ({ name, ror }: InstitutionSearchResult) => (ror.length > 0 ? `${name} · ${ror}` : name);

export type InstitutionAutocompleteText = {
  /** The heading of the decision's own name-search suggestions. */
  readonly suggestions: string;
  /** The heading of the institutions a search found beyond them. */
  readonly otherInstitutions: string;
  readonly searching: string;
  readonly unavailable: string;
  readonly noOtherMatches: string;
  /** How to reach the rest of Thoth's institutions. */
  readonly hint: string;
};

type InstitutionAutocompleteProps = {
  readonly id: string;
  /** The accessible name of the control: enough Work, contributor and field context to stand alone. */
  readonly label: string;
  /** The id of the question the control answers. */
  readonly describedBy?: string;
  /** The decision's own suggestions, in the order the plan gives them. */
  readonly suggestions: readonly OnixReviewOption[];
  /** The omission, already named: always offered, always last. */
  readonly omitOption: OnixReviewOption | null;
  /** The searched institution the plan accepted as this decision's answer, where it did. */
  readonly searchedOption: OnixReviewOption | null;
  readonly declaredRor: string;
  readonly declaredDoi: string;
  /** The answer the inputs hold. */
  readonly value: string | undefined;
  readonly error?: boolean;
  readonly helperText?: string;
  readonly text: InstitutionAutocompleteText;
  /** Thoth's existing institution search, by filter. */
  readonly search: (filter: string) => Promise<readonly InstitutionSearchResult[]>;
  readonly onChange: (answer: string | undefined) => void;
};

/**
 * An existing Thoth institution for an affiliation or a funder the file does not identify exactly (thoth-app#289): the
 * decision's own suggestions, narrowed by typing, and - from three characters, once typing pauses - the rest of Thoth's
 * institutions, searched as the institution pages search them. Nothing is preselected or chosen for the publisher; the
 * omission is always the last answer; an institution the source's declared identity rules out is never offered; and a
 * search that fails says so rather than finding nothing. Only the latest search is ever shown.
 */
export const InstitutionAutocomplete = ({
  id,
  label,
  describedBy,
  suggestions,
  omitOption,
  searchedOption,
  declaredRor,
  declaredDoi,
  value,
  error = false,
  helperText,
  text,
  search,
  onChange,
}: InstitutionAutocompleteProps) => {
  const hintId = useId();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'IDLE' });
  // Every search is numbered; a response to any but the latest is ignored, so an older one never overwrites a newer.
  const latest = useRef(0);
  // The search as last given: a caller's new function identity is no reason to search again.
  const searchRef = useRef(search);
  const filter = query.replace(/\s+/g, ' ').trim();
  const searches = filter.length >= INSTITUTION_SEARCH_MIN_LENGTH;

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    latest.current += 1;

    if (!searches) return undefined;

    const ticket = latest.current;
    const timer = setTimeout(() => {
      searchRef.current(filter).then(
        (results) => {
          if (ticket === latest.current) setState({ kind: 'DONE', results });
        },
        () => {
          if (ticket === latest.current) setState({ kind: 'FAILED' });
        },
      );
    }, INSTITUTION_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filter, searches]);

  const typed = folded(query);
  const suggested: PickerOption[] = suggestions.map(({ key, label: name }) => ({
    kind: 'ANSWER',
    group: 'SUGGESTED',
    key,
    label: name,
  }));
  const suggestedKeys = new Set(suggestions.map(({ key }) => key));
  const status = (key: string, statusLabel: string): PickerOption => ({
    kind: 'STATUS',
    group: 'SEARCHED',
    key: `status:${key}`,
    label: statusLabel,
  });
  let found: PickerOption[] = [];

  if (searches) {
    if (state.kind === 'DONE') {
      const others = state.results.filter(
        (result) =>
          !suggestedKeys.has(result.institutionId) && declaredIdentityAllows({ declaredRor, declaredDoi }, result),
      );

      found =
        others.length > 0
          ? others.map((result) => ({
              kind: 'ANSWER',
              group: 'SEARCHED',
              key: onixSearchedInstitutionAnswer(result),
              label: resultLabel(result),
            }))
          : [status('none', text.noOtherMatches)];
    } else if (state.kind === 'FAILED') {
      found = [status('failed', text.unavailable)];
    } else {
      found = [status('loading', text.searching)];
    }
  }

  // The current searched answer stays choosable, and shown, until another is chosen.
  const chosen: PickerOption | null =
    searchedOption === null
      ? null
      : { kind: 'ANSWER', group: 'SEARCHED', key: searchedOption.key, label: searchedOption.label };

  if (chosen !== null && !found.some(({ key }) => key === chosen.key)) {
    found = [
      ...found.filter(({ kind }) => kind === 'ANSWER'),
      chosen,
      ...found.filter(({ kind }) => kind === 'STATUS'),
    ];
  }

  const omitted: PickerOption[] =
    omitOption === null ? [] : [{ kind: 'ANSWER', group: 'OMIT', key: omitOption.key, label: omitOption.label }];
  const options = [...suggested, ...found, ...omitted];
  // The answer, as one value for as long as it stands: a value that changed identity on every render would reset what
  // the publisher is typing. An answer the plan refused is no option: the control is empty, and the refusal is said.
  const [selectedGroup, selectedLabel]: [Group, string | null] =
    value === undefined
      ? ['SUGGESTED', null]
      : value === omitOption?.key
        ? ['OMIT', omitOption.label]
        : value === searchedOption?.key
          ? ['SEARCHED', searchedOption.label]
          : ['SUGGESTED', suggestions.find(({ key }) => key === value)?.label ?? null];
  const selected = useMemo<PickerOption | null>(
    () =>
      value === undefined || selectedLabel === null
        ? null
        : { kind: 'ANSWER', group: selectedGroup, key: value, label: selectedLabel },
    [value, selectedGroup, selectedLabel],
  );
  const loading = searches && state.kind === 'LOADING';

  return (
    <Autocomplete<PickerOption, false, false, false>
      id={id}
      options={options}
      value={selected}
      onChange={(_event, option) => onChange(option?.kind === 'ANSWER' ? option.key : undefined)}
      onInputChange={(_event, input, reason) => {
        // Only what the publisher types narrows or searches; showing the chosen answer does neither.
        const next = reason === 'input' ? input : '';

        setQuery(next);
        setState(next.trim().length >= INSTITUTION_SEARCH_MIN_LENGTH ? { kind: 'LOADING' } : { kind: 'IDLE' });
      }}
      // Typing narrows the suggestions by name and ROR, without case or diacritics; the search's results are its own.
      filterOptions={(shown) =>
        shown.filter(({ group, label: name }) => group !== 'SUGGESTED' || folded(name).includes(typed))
      }
      groupBy={({ group }) => group}
      renderGroup={({ key, group, children }) =>
        group === 'OMIT' ? (
          <li key={key}>
            <ul className="p-0">{children}</ul>
          </li>
        ) : (
          <li key={key} role="group" aria-labelledby={`${id}-group-${group}`}>
            <ListSubheader id={`${id}-group-${group}`} component="div">
              {group === 'SUGGESTED' ? text.suggestions : text.otherInstitutions}
            </ListSubheader>
            <ul className="p-0">{children}</ul>
          </li>
        )
      }
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          {option.kind === 'STATUS' && option.key === 'status:loading' && (
            <CircularProgress size={16} className="mr-2" aria-hidden />
          )}
          {option.label}
        </li>
      )}
      getOptionLabel={(option) => option.label}
      getOptionDisabled={(option) => option.kind === 'STATUS'}
      isOptionEqualToValue={(option, current) => option.key === current.key}
      autoHighlight
      openOnFocus
      size="small"
      className="max-w-md"
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText ?? text.hint}
          slotProps={{
            formHelperText: { id: hintId },
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={16} aria-label={text.searching} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
            htmlInput: {
              ...params.inputProps,
              'aria-describedby':
                [describedBy, hintId, params.inputProps['aria-describedby']].filter(Boolean).join(' ') || undefined,
            },
          }}
        />
      )}
    />
  );
};
