import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ContentWrapper from './ContentPreview';

describe('ContentPreview', () => {
  it('renders children', () => {
    render(<ContentWrapper><span>Preview content</span></ContentWrapper>);
    expect(screen.getByText('Preview content')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<ContentWrapper className="custom-class"><span>Content</span></ContentWrapper>);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
