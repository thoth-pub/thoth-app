import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FullScreenModal from './FullScreenModal';

describe('FullScreenModal', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run; without it a
  // second open modal would leave two "Close" controls in the document.
  afterEach(cleanup);

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
    const { container } = render(<FullScreenModal title="Closed" isOpen={false} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(container).toBeDefined();
  });

  it('can be dismissed by default: the close control and escape both call onClose', async () => {
    const onClose = vi.fn();
    render(
      <FullScreenModal title="Open" isOpen onClose={onClose}>
        <div>content</div>
      </FullScreenModal>,
    );

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).not.toBeDisabled();

    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('refuses dismissal when not dismissible: the close control is disabled and escape is ignored', async () => {
    const onClose = vi.fn();
    render(
      <FullScreenModal title="Locked" isOpen isDismissible={false} onClose={onClose}>
        <div>content</div>
      </FullScreenModal>,
    );

    // The close control (which shares its handler with the backdrop) is disabled and does nothing.
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();

    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
