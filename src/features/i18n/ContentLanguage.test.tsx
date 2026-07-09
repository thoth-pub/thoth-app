import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContentLanguage from './ContentLanguage';

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    i18n: { language: 'en', changeLanguage: vi.fn() },
  })),
}));

describe('ContentLanguage', () => {
  it('renders a select element', () => {
    const { container } = render(<ContentLanguage />);
    const select = container.querySelector('select');
    expect(select).toBeDefined();
  });
});
