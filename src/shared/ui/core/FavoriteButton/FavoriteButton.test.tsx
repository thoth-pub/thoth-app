import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';

import FavoriteButton from './FavoriteButton';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

describe('FavoriteButton', () => {
  it('renders filled star when isFavorite is true', () => {
    const { container } = render(<Wrapper><FavoriteButton isFavorite /></Wrapper>);
    expect(container.querySelector('[data-testid="StarIcon"]')).toBeTruthy();
  });

  it('renders outline star when isFavorite is false', () => {
    const { container } = render(<Wrapper><FavoriteButton isFavorite={false} /></Wrapper>);
    expect(container.querySelector('[data-testid="StarBorderIcon"]')).toBeTruthy();
  });
});
