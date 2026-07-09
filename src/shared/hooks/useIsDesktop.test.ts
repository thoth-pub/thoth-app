import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseMedia = vi.fn();

vi.mock('react-use', () => ({
  useMedia: (query: string, fallback: boolean) => mockUseMedia(query, fallback),
}));

import useIsDesktop from './useIsDesktop';

describe('useIsDesktop', () => {
  it('should use default width of 1024', () => {
    mockUseMedia.mockReturnValue(true);
    const { result } = renderHook(() => useIsDesktop());

    expect(mockUseMedia).toHaveBeenCalledWith('(min-width: 1024px)', false);
    expect(result.current).toBe(true);
  });

  it('should use custom width when provided', () => {
    mockUseMedia.mockReturnValue(false);
    const { result } = renderHook(() => useIsDesktop(768));

    expect(mockUseMedia).toHaveBeenCalledWith('(min-width: 768px)', false);
    expect(result.current).toBe(false);
  });

  it('should return the value from useMedia', () => {
    mockUseMedia.mockReturnValue(true);
    const { result } = renderHook(() => useIsDesktop(1024));

    expect(result.current).toBe(true);
  });
});
