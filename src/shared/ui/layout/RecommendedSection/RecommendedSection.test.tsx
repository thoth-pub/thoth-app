import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';

import RecommendedSection from './RecommendedSection';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

describe('RecommendedSection', () => {
  it('renders title', () => {
    render(<Wrapper><RecommendedSection title="My Section" /></Wrapper>);
    expect(screen.getByText('My Section')).toBeTruthy();
  });

  it('renders children function with showRecommendations false', () => {
    render(
      <Wrapper>
        <RecommendedSection title="Section">
          {({ showRecommendations }) => <div>{showRecommendations ? 'shown' : 'hidden'}</div>}
        </RecommendedSection>
      </Wrapper>,
    );
    expect(screen.getByText('hidden')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Wrapper><RecommendedSection title="Section" className="extra-class" /></Wrapper>,
    );
    expect(container.querySelector('.extra-class')).toBeTruthy();
  });
});
