import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { theme } from '@/src/shared/theme';

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useNotifications: vi.fn(() => ({ sendErrorNotification: vi.fn() })),
  useIsDeutchLocale: vi.fn(() => false),
}));

// Stub the heavy editor: it stands in for "the editable language control".
vi.mock('@/src/entities/language', () => ({
  LanguagesForm: ({ languages }: { languages: LanguageEntity[] }) => (
    <div data-testid="languages-form">{languages.map(({ code }) => code).join(', ')}</div>
  ),
}));

import BulkEditLanguages from './BulkEditLanguages';

const chaptersWithLanguages = (perChapter: string[][]): WorkEntity[] =>
  perChapter.map(
    (codes, index) =>
      ({
        id: `${index}`,
        languages: codes.map((code) => ({ id: `${code}-${index}`, code, relation: 'ORIGINAL' })),
      }) as unknown as WorkEntity,
  );

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

afterEach(() => cleanup());

describe('EditChaptersModal bulk language control', () => {
  it('EditChaptersModal_showsCommonLanguageSetForSelectedChapters', () => {
    render(
      <Wrapper>
        <BulkEditLanguages
          chapters={chaptersWithLanguages([['en'], ['en']])}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </Wrapper>,
    );

    // English is shown immediately and the control is editable.
    expect(screen.getByTestId('languages-form')).toHaveTextContent('en');
    expect(screen.queryByText('chaptersLanguagesMismatch')).not.toBeInTheDocument();
  });

  it('EditChaptersModal_blocksLanguageEditWhenLanguageSetsDiffer', () => {
    render(
      <Wrapper>
        <BulkEditLanguages
          chapters={chaptersWithLanguages([['en'], ['fr']])}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </Wrapper>,
    );

    // Mismatch notice shown; the editable control is not rendered.
    expect(screen.getByText('chaptersLanguagesMismatch')).toBeInTheDocument();
    expect(screen.queryByTestId('languages-form')).not.toBeInTheDocument();
  });
});
