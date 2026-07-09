import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultLocale: 'fr' }];

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ userImprints: mockUserImprints }),
}));

vi.mock('@/src/shared/config', () => ({
  appConfig: {
    publisherDefaultValues: { defaultLocale: 'en' },
  },
}));

vi.mock('@/src/shared/utils', () => ({
  findLocaleOption: (locale: string) => ({ value: locale, label: locale }),
}));

import useDefaultLocaleOption from './useDefaultLocaleOption';

describe('useDefaultLocaleOption', () => {
  it('should return the imprint default locale', () => {
    const { result } = renderHook(() => useDefaultLocaleOption('imprint-1'));
    expect(result.current).toEqual({ value: 'fr', label: 'fr' });
  });

  it('should fall back to app config default when imprint not found', () => {
    const { result } = renderHook(() => useDefaultLocaleOption('unknown'));
    expect(result.current).toEqual({ value: 'en', label: 'en' });
  });

  it('should fall back to app config default when imprint has no locale', () => {
    mockUserImprints.length = 0;
    mockUserImprints.push({ id: 'imprint-2' } as never);

    const { result } = renderHook(() => useDefaultLocaleOption('imprint-2'));
    expect(result.current).toEqual({ value: 'en', label: 'en' });
  });
});
