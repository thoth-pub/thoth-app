import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubjectTypes } from '@/src/shared/constants';
import { theme } from '@/src/shared/theme';
import { loadThemaNames, resetThemaNamesLoader, type ThemaNames } from '@/src/shared/utils/subjects/thema-names';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import { EditSubject } from '../../EditSubject/EditSubject';
import { AddSubject } from '../components/AddSubject';
import ListItem from '../components/ListItem';
import { NewSubjectModal } from '../components/NewSubjectModal';

/** Thema subject names in German in the subject list and the three subject forms (thoth-app#315). */

const mockLocale = vi.hoisted(() => vi.fn(() => 'de'));

vi.mock('@/src/shared/hooks/useActiveLocale', () => ({ default: mockLocale }));

vi.mock('@/src/entities/subject/store/subject.store', () => ({
  useSubjectStateMachine: vi.fn(() => ({
    activeEntity: { id: 'subject-1', code: 'AB', type: 'THEMA', ordinal: 1 },
    finishEditing: vi.fn(),
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

const GERMAN_AB = 'AB (Kunst: allgemeine Themen) ';
const ENGLISH_AB = 'AB (The arts: general topics) ';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  </ThemeProvider>
);

const deferred = () => {
  let resolve: (names: ThemaNames) => void = () => {};
  const promise = new Promise<ThemaNames>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const chooseThemaType = (root: ParentNode) => {
  const typeInput = root.querySelector<HTMLInputElement>('input[name="subjectType"]');
  if (!typeInput) throw new Error('no subject type input');

  fireEvent.change(typeInput, { target: { value: SubjectTypes.enum.Thema } });
};

const codeInput = async (root: ParentNode) => {
  let input: HTMLInputElement | null = null;
  await waitFor(() => {
    input = root.querySelector<HTMLInputElement>('input#subjectCode[role="combobox"]');
    expect(input).not.toBeNull();
  });

  return input as unknown as HTMLInputElement;
};

// Focus first: MUI Autocomplete resets the text of an unfocused input to the selected label. Typing before the
// list opens keeps jsdom from rendering all 9,448 options.
const pickOption = async (input: HTMLInputElement, typed: string, label: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: typed } });
  const option = await screen.findByRole('option', { name: label.trim() });

  expect(option.textContent).toBe(label);
  fireEvent.click(option);
};

beforeEach(() => {
  mockLocale.mockReturnValue('de');
  resetThemaNamesLoader();
});

describe('Thema names in German (thoth-app#315)', () => {
  it('shows the German name in the subject list', async () => {
    const subject: SubjectEntity = { id: 'subject-1' as SubjectId, code: 'AB', type: 'THEMA', ordinal: 1 };

    render(
      <Wrapper>
        <ListItem
          workId="work-1"
          activeSubjectId={'other' as SubjectId}
          isEditDisabled={false}
          subject={subject}
          totalSubjectsCount={1}
        />
      </Wrapper>,
    );

    expect(await screen.findByText('Kunst: allgemeine Themen')).toBeInTheDocument();
  });

  it('lists and submits a German option in AddSubject', async () => {
    await loadThemaNames('de');
    const onAdd = vi.fn();
    const { container } = render(
      <Wrapper>
        <AddSubject onAdd={onAdd} />
      </Wrapper>,
    );

    chooseThemaType(container);
    await pickOption(await codeInput(container), 'allgemeine Themen', GERMAN_AB);

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ type: SubjectTypes.enum.Thema, code: 'AB' }));
  });

  it('lists and submits a German option in NewSubjectModal', async () => {
    await loadThemaNames('de');
    const onAdd = vi.fn();
    render(
      <Wrapper>
        <NewSubjectModal open onAdd={onAdd} onClose={vi.fn()} />
      </Wrapper>,
    );

    chooseThemaType(document.body);
    await pickOption(await codeInput(document.body), 'allgemeine Themen', GERMAN_AB);

    const submit = document.body.querySelector('[data-testid="CheckIcon"]')?.closest('button');
    if (!submit) throw new Error('no submit button');
    fireEvent.click(submit);

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ type: SubjectTypes.enum.Thema, code: 'AB' }));
  });

  it('keeps a code picked from the English options once the German names load', async () => {
    const load = deferred();
    resetThemaNamesLoader({ de: () => load.promise });
    const onAdd = vi.fn();
    const { container } = render(
      <Wrapper>
        <AddSubject onAdd={onAdd} />
      </Wrapper>,
    );

    chooseThemaType(container);
    const input = await codeInput(container);
    await pickOption(input, 'general topics', ENGLISH_AB);
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ type: SubjectTypes.enum.Thema, code: 'AB' }));

    const { THEMA_NAMES_DE } = await import('@/src/shared/utils/subjects/thema-names-de');
    await act(async () => {
      load.resolve(THEMA_NAMES_DE);
    });

    expect(input.value).toMatch(/^AB \(/);
    expect(onAdd.mock.calls.every(([value]) => value.type === SubjectTypes.enum.Thema && value.code === 'AB')).toBe(
      true,
    );
  });

  it('shows the German label in EditSubject mounted after the load', async () => {
    await loadThemaNames('de');

    const { container } = render(
      <Wrapper>
        <EditSubject workId="work-1" />
      </Wrapper>,
    );

    const input = await codeInput(container);
    expect(input.value).toBe(GERMAN_AB);
  });
});
