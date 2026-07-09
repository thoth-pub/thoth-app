import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BooksChip from './BooksChip';

describe('BooksChip', () => {
  it('renders chip with book count', () => {
    const { container } = render(<BooksChip booksCount={5} />);
    expect(container.textContent).toContain('5');
  });

  it('returns null if booksCount less than 1', () => {
    const { container } = render(<BooksChip booksCount={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null if booksCount is negative', () => {
    const { container } = render(<BooksChip booksCount={-1} />);
    expect(container.innerHTML).toBe('');
  });
});
