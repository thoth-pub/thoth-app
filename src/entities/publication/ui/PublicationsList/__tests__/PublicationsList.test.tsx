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

import PublicationsList from '../PublicationsList';

const mockPublications = [
  { id: '1', type: 'PAPERBACK', isbn: '978-1-234-56789-0', prices: [], locations: [], width: null, widthIn: null, height: null, heightIn: null, depth: null, depthIn: null, weight: null, weightOz: null },
  { id: '2', type: 'HARDCOVER', isbn: '978-0-123-45678-9', prices: [], locations: [], width: null, widthIn: null, height: null, heightIn: null, depth: null, depthIn: null, weight: null, weightOz: null },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('PublicationsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <PublicationsList activePublication={null} publications={mockPublications} form={<div />} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('PublicationsList');
  });

  it('renders empty list', () => {
    const { container } = render(
      <Wrapper>
        <PublicationsList activePublication={null} publications={[]} form={<div />} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('PublicationsList - empty');
  });

  it('renders with callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <PublicationsList activePublication={null} publications={mockPublications} form={<div />} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('PublicationsList - with callbacks');
  });
});
