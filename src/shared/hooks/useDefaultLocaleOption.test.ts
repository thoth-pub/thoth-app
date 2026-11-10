import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultLocale: 'fr' }];

const mockIdentity = { identitySettled: true };

vi.mock('@/src/entities/user', () => ({
  // While identity has not settled the raw `userImprints` are empty, and only the settled imprints are trusted.
  useUser: () => ({
    userImprints: [],
    identitySettled: mockIdentity.identitySettled,
    settledImprints: mockIdentity.identitySettled ? mockUserImprints : [],
  }),
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
  beforeEach(() => {
    mockIdentity.identitySettled = true;
  });

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

  it('applies no default locale until identity has settled', () => {
    mockIdentity.identitySettled = false;

    const { result } = renderHook(() => useDefaultLocaleOption('imprint-1'));
    expect(result.current).toBeUndefined();
  });

  it('applies no app config fallback from the empty identity of a loading or expired session', () => {
    mockIdentity.identitySettled = false;

    const { result } = renderHook(() => useDefaultLocaleOption('unknown'));
    expect(result.current).toBeUndefined();
  });
});
