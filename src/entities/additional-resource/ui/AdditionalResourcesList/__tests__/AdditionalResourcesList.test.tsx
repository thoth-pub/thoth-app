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

import AdditionalResourcesList from '../AdditionalResourcesList';

const mockResources = [
  { id: '1', workId: 'w1', title: 'Resource A', description: '', attribution: '', resourceType: 'WEBSITE', doi: '', handle: '', url: 'https://example.com/resource-a', fileUrl: '', orderNumber: 1 },
  { id: '2', workId: 'w1', title: 'Resource B', description: '', attribution: '', resourceType: 'WEBSITE', doi: '', handle: '', url: 'https://example.com/resource-b', fileUrl: '', orderNumber: 2 },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('AdditionalResourcesList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <AdditionalResourcesList activeAdditionalResource={null} additionalResources={mockResources} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('AdditionalResourcesList');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper>
        <AdditionalResourcesList activeAdditionalResource={null} additionalResources={[]} />
      </Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders with callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <AdditionalResourcesList activeAdditionalResource={null} additionalResources={mockResources} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('AdditionalResourcesList - with callbacks');
  });
});
