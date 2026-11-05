import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { onixSearchedInstitutionAnswer } from '@/src/shared/parsers/XMLParser/onixDescriptive';

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

import {
  INSTITUTION_SEARCH_DEBOUNCE_MS,
  InstitutionAutocomplete,
  type InstitutionSearchResult,
} from './InstitutionAutocomplete';
import type { OnixReviewOption } from './reviewModel';

const LABEL = 'Affiliation - Institute of Example Studies (A Work)';
const TEXT = {
  suggestions: 'Matching Thoth institutions',
  otherInstitutions: 'Other Thoth institutions',
  searching: 'Searching Thoth…',
  unavailable: 'Search unavailable, try again',
  noOtherMatches: 'No other Thoth institution matches',
  hint: 'Type at least 3 characters to search all Thoth institutions.',
};
const SUGGESTIONS: OnixReviewOption[] = [
  { key: 'institution-zurich', label: 'Universität Zürich · https://ror.org/02crff812' },
  { key: 'institution-example', label: 'Institute of Example Studies' },
];
const OMIT: OnixReviewOption = { key: 'OMIT', label: 'Import no affiliation' };
const result = (institutionId: string, name: string, ror = '', doi = ''): InstitutionSearchResult => ({
  institutionId,
  name,
  ror,
  doi,
});

/** A search the test settles itself, one deferred response per call, in call order. */
const deferredSearch = () => {
  const pending: {
    filter: string;
    resolve: (results: InstitutionSearchResult[]) => void;
    reject: (error: Error) => void;
  }[] = [];
  const search = vi.fn(
    (filter: string) =>
      new Promise<readonly InstitutionSearchResult[]>((resolve, reject) => {
        pending.push({ filter, resolve, reject });
      }),
  );

  return { search, pending };
};

const pause = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const renderPicker = (
  props: Partial<Parameters<typeof InstitutionAutocomplete>[0]> & {
    search: Parameters<typeof InstitutionAutocomplete>[0]['search'];
  },
) => {
  const onChange = vi.fn<(answer: string | undefined) => void>();

  render(
    <InstitutionAutocomplete
      id="institution"
      label={LABEL}
      suggestions={SUGGESTIONS}
      omitOption={OMIT}
      searchedOption={null}
      declaredRor=""
      declaredDoi=""
      value={undefined}
      text={TEXT}
      onChange={onChange}
      {...props}
    />,
  );

  return { onChange, input: screen.getByRole('combobox', { name: LABEL }) };
};

const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);
const group = (name: string) => screen.queryByRole('group', { name });

describe('InstitutionAutocomplete (thoth-app#289)', { timeout: 30_000 }, () => {
  it('opens with the suggestions in their order and the omission last, searching nothing', async () => {
    const { search } = deferredSearch();
    const { input } = renderPicker({ search });

    expect(input).toHaveValue('');
    expect(input).toHaveAccessibleDescription(TEXT.hint);
    await userEvent.click(input);

    expect(optionNames()).toEqual([...SUGGESTIONS.map(({ label }) => label), OMIT.label]);
    expect(
      within(group(TEXT.suggestions) as HTMLElement)
        .getAllByRole('option')
        .map(({ textContent }) => textContent),
    ).toEqual(SUGGESTIONS.map(({ label }) => label));
    expect(group(TEXT.otherInstitutions)).not.toBeInTheDocument();
    await pause(INSTITUTION_SEARCH_DEBOUNCE_MS + 100);
    expect(search).not.toHaveBeenCalled();
  });

  it('filters the suggestions by name and ROR, without case or diacritics, and below three characters asks Thoth nothing', async () => {
    const { search } = deferredSearch();
    const { input } = renderPicker({ search });

    await userEvent.type(input, 'zu');
    expect(optionNames()).toEqual([SUGGESTIONS[0].label, OMIT.label]);
    await userEvent.clear(input);
    await userEvent.type(input, '02');
    expect(optionNames()).toEqual([SUGGESTIONS[0].label, OMIT.label]);
    await userEvent.clear(input);
    await userEvent.type(input, 'EX');
    expect(optionNames()).toEqual([SUGGESTIONS[1].label, OMIT.label]);
    await pause(INSTITUTION_SEARCH_DEBOUNCE_MS + 100);
    expect(search).not.toHaveBeenCalled();
  });

  it('searches Thoth once typing pauses from three characters, offering only the institutions not suggested and not ruled out', async () => {
    const { search, pending } = deferredSearch();
    const { input, onChange } = renderPicker({ search, declaredRor: 'https://ror.org/02crff812' });

    await userEvent.type(input, 'Züri');
    // A loading state while the search runs; never "no results".
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search).toHaveBeenCalledWith('Züri');
    expect(screen.getByRole('progressbar', { name: TEXT.searching })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: TEXT.searching })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(TEXT.noOtherMatches)).not.toBeInTheDocument();

    await act(async () =>
      pending[0].resolve([
        result('institution-zurich', 'Universität Zürich', 'https://ror.org/02crff812'),
        result('institution-zhaw', 'Zürcher Hochschule', 'https://ror.org/05pmsvm27'),
        result('institution-zurich-press', 'Zürich University Press'),
      ]),
    );

    // The suggested institution is not repeated; one of another ROR than the declared one is not offered.
    expect(optionNames()).toEqual([SUGGESTIONS[0].label, 'Zürich University Press', OMIT.label]);
    expect(
      within(group(TEXT.otherInstitutions) as HTMLElement)
        .getAllByRole('option')
        .map(({ textContent }) => textContent),
    ).toEqual(['Zürich University Press']);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await pause(INSTITUTION_SEARCH_DEBOUNCE_MS + 100);
    expect(search).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('option', { name: 'Zürich University Press' }));
    expect(onChange).toHaveBeenLastCalledWith(
      onixSearchedInstitutionAnswer(result('institution-zurich-press', 'Zürich University Press')),
    );
  });

  it('shows a failed search as unavailable, never as finding nothing', async () => {
    const { search, pending } = deferredSearch();
    const { input } = renderPicker({ search });

    await userEvent.type(input, 'Example');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await act(async () => pending[0].reject(new Error('network down')));

    expect(screen.getByRole('option', { name: TEXT.unavailable })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(TEXT.noOtherMatches)).not.toBeInTheDocument();
    // The suggestions and the omission are still there to choose.
    expect(optionNames()).toEqual([SUGGESTIONS[1].label, TEXT.unavailable, OMIT.label]);
  });

  it('says a search that succeeded with nothing new found nothing new', async () => {
    const { search, pending } = deferredSearch();
    const { input } = renderPicker({ search });

    await userEvent.type(input, 'Example');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await act(async () => pending[0].resolve([result('institution-example', 'Institute of Example Studies')]));

    expect(screen.getByRole('option', { name: TEXT.noOtherMatches })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(TEXT.unavailable)).not.toBeInTheDocument();
  });

  it('keeps settled results when only spacing changes, searching no more (review F1)', async () => {
    const { search, pending } = deferredSearch();
    const { input } = renderPicker({ search, suggestions: [] });

    await userEvent.type(input, 'Xyl');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await act(async () => pending[0].resolve([result('institution-xylo', 'Xylo Institute')]));
    expect(optionNames()).toEqual(['Xylo Institute', OMIT.label]);

    await userEvent.type(input, ' ');
    await pause(INSTITUTION_SEARCH_DEBOUNCE_MS + 100);

    expect(optionNames()).toEqual(['Xylo Institute', OMIT.label]);
    expect(screen.queryByRole('option', { name: TEXT.searching })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('never lets an older search overwrite a newer one', async () => {
    const { search, pending } = deferredSearch();
    const { input } = renderPicker({ search });

    await userEvent.type(input, 'Lond');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await userEvent.type(input, 'on School');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(pending.map(({ filter }) => filter)).toEqual(['Lond', 'London School']);

    await act(async () => pending[1].resolve([result('institution-lse', 'London School of Economics')]));
    await act(async () => pending[0].resolve([result('institution-londonderry', 'Londonderry College')]));

    expect(optionNames()).toEqual(['London School of Economics', OMIT.label]);
  });

  it('takes a searched institution, and the omission, by keyboard alone', async () => {
    const { search, pending } = deferredSearch();
    const { input, onChange } = renderPicker({ search, suggestions: [] });

    await userEvent.tab();
    expect(input).toHaveFocus();
    await userEvent.keyboard('Arcadia');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await act(async () => pending[0].resolve([result('institution-arcadia', 'Arcadia', 'https://ror.org/05t4ynm84')]));
    await userEvent.keyboard('{ArrowDown}{ArrowUp}{Enter}');

    expect(onChange).toHaveBeenLastCalledWith(
      onixSearchedInstitutionAnswer(result('institution-arcadia', 'Arcadia', 'https://ror.org/05t4ynm84')),
    );

    await userEvent.clear(input);
    await userEvent.keyboard('{ArrowDown}');
    // Only the omission is left, and it is the last answer.
    expect(optionNames()).toEqual([OMIT.label]);
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('OMIT');
  });

  it('shows the searched answer the plan accepted as the current value, and offers a funder only its declared DOI', async () => {
    const { search, pending } = deferredSearch();
    const searched = onixSearchedInstitutionAnswer(result('institution-arcadia', 'Arcadia'));
    const { input } = renderPicker({
      search,
      suggestions: [],
      searchedOption: { key: searched, label: 'Arcadia' },
      value: searched,
      declaredDoi: 'https://doi.org/10.13039/501100000001',
    });

    expect(input).toHaveValue('Arcadia');

    await userEvent.clear(input);
    await userEvent.type(input, 'Fund');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await act(async () =>
      pending[0].resolve([
        result('institution-other', 'Other Fund', '', 'https://doi.org/10.13039/999'),
        result('institution-declared', 'Declared Fund', '', 'https://doi.org/10.13039/501100000001'),
      ]),
    );

    expect(optionNames()).toEqual(['Declared Fund', 'Arcadia', OMIT.label]);
  });
});
