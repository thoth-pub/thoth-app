import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';

import DataIndicator from './DataIndicator';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

describe('DataIndicator', () => {
  it('renders with 0% when isEmpty is true', () => {
    const { container } = render(<Wrapper><DataIndicator isEmpty /></Wrapper>);
    const fill = container.querySelector('.h-full');
    expect(fill?.getAttribute('style')).toContain('width: 0%');
  });

  it('renders with 100% when isValid is true', () => {
    const { container } = render(<Wrapper><DataIndicator isEmpty={false} isValid /></Wrapper>);
    const fill = container.querySelector('.h-full');
    expect(fill?.getAttribute('style')).toContain('width: 100%');
  });

  it('renders with 50% when not empty and not valid', () => {
    const { container } = render(<Wrapper><DataIndicator isEmpty={false} isValid={false} /></Wrapper>);
    const fill = container.querySelector('.h-full');
    expect(fill?.getAttribute('style')).toContain('width: 50%');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<Wrapper><DataIndicator onClick={onClick} /></Wrapper>);
    container.querySelector('button')!.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
