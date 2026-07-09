import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FullScreenModal from './FullScreenModal';

describe('FullScreenModal', () => {
  it('renders without crashing when open', () => {
    const { baseElement } = render(
      <FullScreenModal title="Test Title" isOpen={true} onClose={vi.fn()} onDone={vi.fn()}>
        <div>Child content</div>
      </FullScreenModal>,
    );
    expect(baseElement.textContent).toContain('Test Title');
    expect(baseElement.textContent).toContain('Child content');
  });

  it('renders without crashing when closed', () => {
    const { container } = render(
      <FullScreenModal title="Closed" isOpen={false} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(container).toBeDefined();
  });
});
