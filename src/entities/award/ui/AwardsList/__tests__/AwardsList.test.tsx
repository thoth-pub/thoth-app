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

import AwardsList from '../AwardsList';

const mockAwards = [
  { id: '1', workId: 'w1', title: 'Booker Prize', url: 'https://example.com/booker', category: 'Fiction', statement: '', role: null, orderNumber: 1, jury: '', year: '2024', country: null },
  { id: '2', workId: 'w1', title: 'Pulitzer', url: 'https://example.com/pulitzer', category: 'Non-Fiction', statement: '', role: null, orderNumber: 2, jury: '', year: '2023', country: null },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AwardsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <AwardsList activeAward={null} awards={mockAwards} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('AwardsList');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper>
        <AwardsList activeAward={null} awards={[]} />
      </Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders with callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <AwardsList activeAward={null} awards={mockAwards} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('AwardsList - with callbacks');
  });
});
