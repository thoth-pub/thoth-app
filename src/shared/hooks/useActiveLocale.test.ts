import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockLanguage = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockLanguage } }),
}));

import useActiveLocale from './useActiveLocale';

describe('useActiveLocale', () => {
  it('should return the current i18n language', () => {
    const { result } = renderHook(() => useActiveLocale());
    expect(result.current).toBe('en');
  });
});
