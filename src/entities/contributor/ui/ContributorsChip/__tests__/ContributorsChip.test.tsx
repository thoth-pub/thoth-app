import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '@/src/shared/theme';

import ContributorsChip from '../ContributorsChip';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

afterEach(cleanup);

describe('ContributorsChip', () => {
  it('renders snapshot with single contributor', () => {
    const { container } = render(
      <Wrapper>
        <ContributorsChip contributors={['John Doe']} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('ContributorsChip - single');
  });

  it('renders snapshot with multiple contributors', () => {
    const { container } = render(
      <Wrapper>
        <ContributorsChip contributors={['John Doe', 'Jane Smith']} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('ContributorsChip - multiple');
  });

  it('renders snapshot with more than limit', () => {
    const { container } = render(
      <Wrapper>
        <ContributorsChip contributors={['A', 'B', 'C', 'D', 'E']} limit={3} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('ContributorsChip - over limit');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper>
        <ContributorsChip contributors={[]} />
      </Wrapper>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('preserves plain-name rendering for existing consumers', () => {
    render(
      <Wrapper>
        <ContributorsChip contributors={['John Doe', 'Jane Smith']} />
      </Wrapper>,
    );

    expect(screen.getByText('John Doe, Jane Smith')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Orcid' })).not.toBeInTheDocument();
  });
});
