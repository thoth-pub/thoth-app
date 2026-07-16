/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import { theme } from '@/src/shared/theme';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useNotifications: vi.fn(() => ({ sendErrorNotification: vi.fn() })),
  useIsDeutchLocale: vi.fn(() => false),
}));

// Keep the language editor tree light: assert on the controlled `languages` it receives.
vi.mock('@/src/entities/language', () => ({
  LanguagesForm: ({ languages }: { languages: LanguageEntity[] }) => (
    <div data-testid="languages-form">{languages.map(({ code }) => code).join(', ')}</div>
  ),
}));

const bulkLicenseState = vi.fn();
const bulkLanguagesState = vi.fn();

vi.mock('../model/useBulkLicenseState', () => ({ useBulkLicenseState: () => bulkLicenseState() }));
vi.mock('../model/useBulkLanguagesState', () => ({ useBulkLanguagesState: () => bulkLanguagesState() }));

import BulkEditLanguages from './BulkEditLanguages';
import BulkEditLicense from './BulkEditLicense';

const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

afterEach(() => cleanup());

describe('bulk controls saving state', () => {
  it('EditChaptersModal_keepsSubmittedLicenceVisibleWhileSaving (rendered)', () => {
    bulkLicenseState.mockReturnValue({
      displayLicense: CC0,
      displayCopyrightHolder: '',
      hasMismatch: false,
      isSaving: true,
      savingCount: 42,
      submit: vi.fn(),
    });

    render(
      <Wrapper>
        <BulkEditLicense chapters={[]} onSubmit={vi.fn()} />
      </Wrapper>,
    );

    // Submitted value stays visible, a saving indicator shows, and the edit affordance is replaced.
    expect(screen.getByText('CC0')).toBeInTheDocument();
    expect(screen.getByText(/saving licence for 42 chapters/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('EditChaptersModal_keepsSubmittedLanguageVisibleWhileSaving (rendered)', () => {
    bulkLanguagesState.mockReturnValue({
      displayLanguages: [{ id: 'en-1', code: 'en', relation: 'ORIGINAL' }],
      hasMismatch: false,
      isSaving: true,
      savingCount: 42,
      submit: vi.fn(),
      deleteLanguage: vi.fn(),
    });

    render(
      <Wrapper>
        <BulkEditLanguages chapters={[]} onSubmit={vi.fn()} onDelete={vi.fn()} />
      </Wrapper>,
    );

    expect(screen.getByTestId('languages-form')).toHaveTextContent('en');
    expect(screen.getByText(/saving language for 42 chapters/i)).toBeInTheDocument();
    expect(screen.getByText(/saving language for 42 chapters/i).closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});
