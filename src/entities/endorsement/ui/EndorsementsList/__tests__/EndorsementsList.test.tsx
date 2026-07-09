import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import EndorsementsList from '../EndorsementsList';

const mockEndorsements = [
  { id: '1', workId: 'w1', authorName: 'Reviewer A', authorOrcid: '', authorRole: 'Reviewer', authorInstitutionId: '', authorInstitutionName: '', authorInstitutionRor: '', url: 'https://example.com/endorsement1', text: 'Great book!', orderNumber: 1 },
  { id: '2', workId: 'w1', authorName: 'Reviewer B', authorOrcid: '', authorRole: 'Reviewer', authorInstitutionId: '', authorInstitutionName: '', authorInstitutionRor: '', url: 'https://example.com/endorsement2', text: 'Highly recommended', orderNumber: 2 },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EndorsementsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EndorsementsList activeEndorsement={null} endorsements={mockEndorsements} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EndorsementsList');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper>
        <EndorsementsList activeEndorsement={null} endorsements={[]} />
      </Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders with callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <EndorsementsList activeEndorsement={null} endorsements={mockEndorsements} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EndorsementsList - with callbacks');
  });
});
