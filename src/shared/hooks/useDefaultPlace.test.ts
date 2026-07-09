import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultPlace: 'London' }];

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ userImprints: mockUserImprints }),
}));

import useDefaultPlace from './useDefaultPlace';

describe('useDefaultPlace', () => {
  it('should return the imprint default place', () => {
    const { result } = renderHook(() => useDefaultPlace('imprint-1'));
    expect(result.current).toBe('London');
  });

  it('should return empty string when imprint not found', () => {
    const { result } = renderHook(() => useDefaultPlace('unknown'));
    expect(result.current).toBe('');
  });

  it('should return empty string when imprint has no defaultPlace', () => {
    mockUserImprints.length = 0;
    mockUserImprints.push({ id: 'imprint-2' } as never);

    const { result } = renderHook(() => useDefaultPlace('imprint-2'));
    expect(result.current).toBe('');
  });
});
