import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import type { AffiliationEntity } from '../model/affiliation.types';
import AffiliationsForm from './AffiliationsForm';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/hooks')>()),
  useEscapeKey: vi.fn(),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

const affiliations: AffiliationEntity[] = [
  {
    id: 'affiliation-1',
    contributionId: 'contribution-1',
    institutionId: 'institution-1',
    institutionName: 'University of Example',
    rorId: 'https://ror.org/012345678',
    position: 'Professor',
    orderNumber: 1,
  },
  {
    id: 'affiliation-2',
    contributionId: 'contribution-1',
    institutionId: 'institution-2',
    institutionName: 'Institution without ROR',
    rorId: '',
    position: '',
    orderNumber: 2,
  },
];

describe('AffiliationsForm', () => {
  it('shows saved affiliation ROR metadata without changing position or institution text', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <AffiliationsForm defaultValue={affiliations} />
      </ThemeProvider>,
    );

    expect(screen.getByText('Professor, University of Example')).toBeInTheDocument();
    expect(screen.getByText('Institution without ROR')).toBeInTheDocument();

    const rorLogos = screen.getAllByAltText('Ror');
    expect(rorLogos).toHaveLength(1);

    await user.hover(rorLogos[0]);

    const rorLink = await screen.findByRole('link', { name: '012345678' });
    expect(rorLink).toHaveAttribute('href', 'https://ror.org/012345678');
  });
});
