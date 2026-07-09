import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./useActiveLocale');

import useActiveLocale from './useActiveLocale';
import useIsGermanLocale from './useIsDeutchLocale';

describe('useIsGermanLocale', () => {
  it('should return true for German locale', () => {
    vi.mocked(useActiveLocale).mockReturnValue('de');
    const { result } = renderHook(() => useIsGermanLocale());
    expect(result.current).toBe(true);
  });

  it('should return false for non-German locale', () => {
    vi.mocked(useActiveLocale).mockReturnValue('en');
    const { result } = renderHook(() => useIsGermanLocale());
    expect(result.current).toBe(false);
  });

  it('should be case-insensitive', () => {
    vi.mocked(useActiveLocale).mockReturnValue('DE');
    const { result } = renderHook(() => useIsGermanLocale());
    expect(result.current).toBe(true);
  });
});
