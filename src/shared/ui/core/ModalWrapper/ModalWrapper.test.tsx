import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ModalWrapper from './ModalWrapper';

describe('ModalWrapper', () => {
  it('renders children', () => {
    render(<ModalWrapper><div>Modal Content</div></ModalWrapper>);
    expect(screen.getByText('Modal Content')).toBeTruthy();
  });

  it('wraps in ClickAwayListener when onClickAway is provided', () => {
    const onClickAway = vi.fn();
    const { container } = render(
      <ModalWrapper onClickAway={onClickAway}><div>Content</div></ModalWrapper>,
    );

    expect(container.querySelector('[class*="flex"]')).toBeTruthy();
  });
});
