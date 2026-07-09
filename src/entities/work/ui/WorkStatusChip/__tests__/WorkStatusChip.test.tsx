import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { WorkStatuses } from '@/src/shared/constants';
import { WorkStatusChip } from '../WorkStatusChip';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('WorkStatusChip', () => {
  it('renders snapshot for Active status', () => {
    const { container } = render(
      <Wrapper><WorkStatusChip status={WorkStatuses.enum.Active} /></Wrapper>
    );
    expect(container).toMatchSnapshot('WorkStatusChip - Active');
  });

  it('renders snapshot for Forthcoming status', () => {
    const { container } = render(
      <Wrapper><WorkStatusChip status={WorkStatuses.enum.Forthcoming} /></Wrapper>
    );
    expect(container).toMatchSnapshot('WorkStatusChip - Forthcoming');
  });

  it('renders snapshot for Withdrawn status', () => {
    const { container } = render(
      <Wrapper><WorkStatusChip status={WorkStatuses.enum.Withdrawn} /></Wrapper>
    );
    expect(container).toMatchSnapshot('WorkStatusChip - Withdrawn');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Wrapper><WorkStatusChip status={WorkStatuses.enum.Active} className="custom-class" /></Wrapper>
    );
    expect(container).toMatchSnapshot('WorkStatusChip - with custom className');
  });
});
