import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FormAnimationWrapper from './FormAnimationWrapper';

describe('FormAnimationWrapper', () => {
  it('renders children', () => {
    render(<FormAnimationWrapper><div>Animated Content</div></FormAnimationWrapper>);
    expect(screen.getByText('Animated Content')).toBeTruthy();
  });

  it('applies className', () => {
    const { container } = render(
      <FormAnimationWrapper className="custom-class"><div>Content</div></FormAnimationWrapper>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('custom-class');
  });

  it('calls onDoubleClick when double-clicked', () => {
    const onDoubleClick = vi.fn();
    render(<FormAnimationWrapper onDoubleClick={onDoubleClick}><div>Click me</div></FormAnimationWrapper>);
    screen.getByText('Click me').parentElement?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onDoubleClick).toHaveBeenCalled();
  });
});
