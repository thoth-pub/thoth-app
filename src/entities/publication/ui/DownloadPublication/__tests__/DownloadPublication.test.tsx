import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';

import DownloadPublication from '../DownloadPublication';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('DownloadPublication', () => {
  it('renders snapshot with fileUrl', () => {
    const { container } = render(
      <Wrapper><DownloadPublication fileUrl="https://example.com/book.pdf" /></Wrapper>
    );
    expect(container).toMatchSnapshot('DownloadPublication');
  });

  it('renders null when fileUrl is empty', () => {
    const { container } = render(
      <Wrapper><DownloadPublication fileUrl="" /></Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });
});
