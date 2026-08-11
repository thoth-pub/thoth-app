/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

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

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock('react-use', () => ({ useCopyToClipboard: () => [null, vi.fn()] }));

import EditFeaturedVideoForm from '../EditFeaturedVideoForm';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditFeaturedVideoForm', () => {
  afterEach(cleanup);

  it('renders the empty file field after Width and Height', () => {
    render(
      <Wrapper>
        <EditFeaturedVideoForm />
      </Wrapper>,
    );

    const height = screen.getAllByText('featuredVideoHeight.label')[0];
    const file = screen.getByText('featuredVideoFile.label');
    expect(height.compareDocumentPosition(file) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('fileUpload.instructions')).toBeInTheDocument();
  });

  it('renders the canonical hosted URL in the file field', () => {
    render(
      <Wrapper>
        <EditFeaturedVideoForm
          title="Promo Video"
          url="https://youtube.com/watch?v=test"
          width={1920}
          height={1080}
          fileUrl="https://example.com/video.mp4"
          onTitleUpdate={vi.fn()}
          onUrlUpdate={vi.fn()}
          onWidthUpdate={vi.fn()}
          onHeightUpdate={vi.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByText('fileUpload.uploaded')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/video.mp4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'fileUpload.openDownload' })).toHaveAttribute(
      'href',
      'https://example.com/video.mp4',
    );
  });
});
