import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignOutButton from './SignOutButton';

const mocks = vi.hoisted(() => ({
  resetLinkedPublishers: vi.fn(),
  queryClientClear: vi.fn(),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    resetLinkedPublishers: mocks.resetLinkedPublishers,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ clear: mocks.queryClientClear })),
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    mocks.resetLinkedPublishers.mockClear();
    mocks.queryClientClear.mockClear();
  });

  it('renders a form with submit button', () => {
    const { container } = render(<SignOutButton />);
    expect(container.querySelector('form')).toBeDefined();
    expect(container.querySelector('button[type="submit"]')).toBeDefined();
  });

  it('SignOutButton_unmountWithoutSubmit_doesNotClearPublisherOrQueryCache', () => {
    const { unmount } = render(<SignOutButton />);

    unmount();

    expect(mocks.resetLinkedPublishers).not.toHaveBeenCalled();
    expect(mocks.queryClientClear).not.toHaveBeenCalled();
  });

  it('SignOutButton_submitClearsPublisherAndQueryCache', () => {
    const { container } = render(<SignOutButton />);
    const form = container.querySelector('form');

    expect(form).toBeDefined();

    fireEvent.submit(form!);

    expect(mocks.resetLinkedPublishers).toHaveBeenCalledTimes(1);
    expect(mocks.queryClientClear).toHaveBeenCalledTimes(1);
  });
});
