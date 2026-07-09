import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SignOutButton from './SignOutButton';

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    resetLinkedPublishers: vi.fn(),
    activePublisher: null,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ clear: vi.fn() })),
}));

describe('SignOutButton', () => {
  it('renders a form with submit button', () => {
    const { container } = render(<SignOutButton />);
    expect(container.querySelector('form')).toBeDefined();
    expect(container.querySelector('button[type="submit"]')).toBeDefined();
  });
});
