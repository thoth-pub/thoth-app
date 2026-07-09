import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultCurrency: 'GBP' }];

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ userImprints: mockUserImprints }),
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
});
