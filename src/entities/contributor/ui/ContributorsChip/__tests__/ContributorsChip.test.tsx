import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';

import ContributorsChip from '../ContributorsChip';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ContributorsChip', () => {
  it('renders snapshot with single contributor', () => {
    const { container } = render(
      <Wrapper><ContributorsChip contributors={['John Doe']} /></Wrapper>
    );
    expect(container).toMatchSnapshot('ContributorsChip - single');
  });

  it('renders snapshot with multiple contributors', () => {
    const { container } = render(
      <Wrapper><ContributorsChip contributors={['John Doe', 'Jane Smith']} /></Wrapper>
    );
    expect(container).toMatchSnapshot('ContributorsChip - multiple');
  });

  it('renders snapshot with more than limit', () => {
    const { container } = render(
      <Wrapper><ContributorsChip contributors={['A', 'B', 'C', 'D', 'E']} limit={3} /></Wrapper>
    );
    expect(container).toMatchSnapshot('ContributorsChip - over limit');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper><ContributorsChip contributors={[]} /></Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });
});
