import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MultipleContentWrapper from './MultipleContentWrapper';

describe('MultipleContentWrapper', () => {
  it('renders children', () => {
    render(<MultipleContentWrapper><div>Item 1</div><div>Item 2</div></MultipleContentWrapper>);
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });
});
