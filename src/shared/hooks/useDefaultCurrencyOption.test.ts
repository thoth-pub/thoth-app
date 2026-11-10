import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultCurrency: 'GBP' }];

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
    publisherDefaultValues: { defaultCurrency: 'USD' },
  },
}));

vi.mock('@/src/shared/utils', () => ({
  findCurrencyOption: (code: string) => ({ value: code, label: code }),
}));

import useDefaultCurrencyOption from './useDefaultCurrencyOption';

describe('useDefaultCurrencyOption', () => {
  beforeEach(() => {
    mockIdentity.identitySettled = true;
  });

  it('should return the imprint default currency', () => {
    const { result } = renderHook(() => useDefaultCurrencyOption('imprint-1'));
    expect(result.current).toEqual({ value: 'GBP', label: 'GBP' });
  });

  it('should fall back to app config default when imprint not found', () => {
    const { result } = renderHook(() => useDefaultCurrencyOption('unknown'));
    expect(result.current).toEqual({ value: 'USD', label: 'USD' });
  });

  it('should fall back to app config default when imprint has no currency', () => {
    mockUserImprints.length = 0;
    mockUserImprints.push({ id: 'imprint-2' } as never);

    const { result } = renderHook(() => useDefaultCurrencyOption('imprint-2'));
    expect(result.current).toEqual({ value: 'USD', label: 'USD' });
  });

  it('applies no default currency until identity has settled', () => {
    mockIdentity.identitySettled = false;

    const { result } = renderHook(() => useDefaultCurrencyOption('imprint-1'));
    expect(result.current).toBeUndefined();
  });

  it('applies no app config fallback from the empty identity of a loading or expired session', () => {
    mockIdentity.identitySettled = false;

    const { result } = renderHook(() => useDefaultCurrencyOption('unknown'));
    expect(result.current).toBeUndefined();
  });
});
