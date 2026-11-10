import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserImprints = [{ id: 'imprint-1', defaultPlace: 'London' }];

const mockIdentity = { identitySettled: true };

vi.mock('@/src/entities/user', () => ({
  // While identity has not settled the raw `userImprints` are empty, and only the settled imprints are trusted.
  useUser: () => ({
    userImprints: [],
    identitySettled: mockIdentity.identitySettled,
    settledImprints: mockIdentity.identitySettled ? mockUserImprints : [],
  }),
}));

import useDefaultPlace from './useDefaultPlace';

describe('useDefaultPlace', () => {
  beforeEach(() => {
    mockIdentity.identitySettled = true;
  });

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

  it('applies no default place until identity has settled', () => {
    mockIdentity.identitySettled = false;

    const { result } = renderHook(() => useDefaultPlace('imprint-1'));
    expect(result.current).toBeUndefined();
  });
});
