import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditBookLink from './EditBookLink';

vi.mock('next/link', () => ({
  default: vi.fn(({ href, children, ...props }) => <a href={href} {...props}>{children}</a>),
}));

vi.mock('remove-markdown', () => ({
  default: vi.fn((s: string) => s),
}));

vi.mock('@/src/shared/hooks', () => ({
  useActiveLocale: vi.fn(() => 'en'),
  useIsDesktop: vi.fn(() => true),
  useTypedTranslation: vi.fn(() => ({ t: (s: string) => s })),
}));

const mockTitles = [{ title: 'Test Book', language: 'EN', isMain: true }];
const mockContributions = [{ isMain: true, fullName: 'Author Name', contributionType: 'AUTHOR' }];

describe('EditBookLink', () => {
  it('renders book information', () => {
    const { container } = render(
      <EditBookLink
        titles={mockTitles}
        id="w1"
        type="MONOGRAPH"
        status="ACTIVE"
        contributions={mockContributions}
        image="/test.jpg"
      />,
    );
    expect(container.textContent).toContain('Test Book');
    expect(container.textContent).toContain('Author Name');
  });

  it('renders without image', () => {
    const { container } = render(
      <EditBookLink
        titles={mockTitles}
        id="w1"
        type="MONOGRAPH"
        status="ACTIVE"
        contributions={mockContributions}
      />,
    );
    expect(container.querySelector('a')).toBeDefined();
  });

  it('handles empty contributions', () => {
    const { container } = render(
      <EditBookLink
        titles={mockTitles}
        id="w1"
        type="MONOGRAPH"
        status="ACTIVE"
        contributions={[]}
      />,
    );
    expect(container.querySelector('a')).toBeDefined();
  });
});
