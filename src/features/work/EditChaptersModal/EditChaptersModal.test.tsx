import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
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

import BulkEditLicense from './components/BulkEditLicense';

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

const chapters = (licenses: string[]): WorkEntity[] => licenses.map((license, index) => ({ id: `${index}`, license }) as WorkEntity);

const chaptersWith = (licenses: string[], copyrightHolder: string): WorkEntity[] =>
  licenses.map((license, index) => ({ id: `${index}`, license, copyrightHolder }) as WorkEntity);

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

afterEach(() => cleanup());

describe('EditChaptersModal bulk licence control', () => {
  it('EditChaptersModal_showsCommonLicenceAndCopyrightHolderForSelectedChapters', () => {
    render(
      <Wrapper>
        <BulkEditLicense
          chapters={chaptersWith([CC_BY, CC_BY], 'Jane Doe')}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />
      </Wrapper>,
    );

    // Real shared values are shown and the field stays editable (edit affordance present).
    expect(screen.getByText(/CC BY © Jane Doe/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText('chaptersLicenseMismatch')).not.toBeInTheDocument();
    expect(screen.queryByText('All Rights Reserved')).not.toBeInTheDocument();
  });

  it('EditChaptersModal_blocksLicenceEditWhenLicencesDiffer', () => {
    render(
      <Wrapper>
        <BulkEditLicense chapters={chapters([CC_BY, CC0])} onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </Wrapper>,
    );

    // Mismatch notice shown; no editable control (no dropdown, no edit button).
    expect(screen.getByText('chaptersLicenseMismatch')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('CC BY')).not.toBeInTheDocument();
  });

  it('EditChaptersModal_blocksLicenceEditWhenCopyrightHoldersDiffer', () => {
    const differingHolders: WorkEntity[] = [
      { id: '0', license: CC_BY, copyrightHolder: 'Jane Doe' } as WorkEntity,
      { id: '1', license: CC_BY, copyrightHolder: 'John Roe' } as WorkEntity,
    ];

    render(
      <Wrapper>
        <BulkEditLicense chapters={differingHolders} onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </Wrapper>,
    );

    // Shared licence but differing copyright holders still blocks the form.
    expect(screen.getByText('chaptersLicenseMismatch')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/CC BY/)).not.toBeInTheDocument();
  });

  it('EditChaptersModal_allowsLicenceEditWhenAllValuesAreEmpty', () => {
    render(
      <Wrapper>
        <BulkEditLicense chapters={chaptersWith(['', ''], '')} onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </Wrapper>,
    );

    // Shared empty state -> editable form (All Rights Reserved is the genuine '' licence).
    expect(screen.getByText('All Rights Reserved')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText('chaptersLicenseMismatch')).not.toBeInTheDocument();
  });

  // Audit regression: when the selected chapters share a common non-default value, no bulk
  // field may fall back to a default work value (e.g. the empty-string `All Rights Reserved`).
  it('EditChaptersModal_doesNotShowDefaultWorkValuesWhenChaptersShareCommonValue', () => {
    render(
      <Wrapper>
        <BulkEditLicense
          chapters={chaptersWith([CC_BY, CC_BY, CC_BY], 'Jane Doe')}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />
      </Wrapper>,
    );

    expect(screen.getByText(/CC BY/)).toBeInTheDocument();
    expect(screen.queryByText('All Rights Reserved')).not.toBeInTheDocument();
    expect(screen.queryByText('chaptersLicenseMismatch')).not.toBeInTheDocument();
  });
});
