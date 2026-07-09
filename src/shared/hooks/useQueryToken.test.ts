import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

import useQueryToken from './useQueryToken';

describe('useQueryToken', () => {
  it('should return the access token when session has one', () => {
    mockUseSession.mockReturnValue({ data: { accessToken: 'test-token' } });
    const { result } = renderHook(() => useQueryToken());
    expect(result.current).toBe('test-token');
  });

  it('should return empty string when session is null', () => {
    mockUseSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => useQueryToken());
    expect(result.current).toBe('');
  });

  it('should return empty string when accessToken is undefined', () => {
    mockUseSession.mockReturnValue({ data: {} });
    const { result } = renderHook(() => useQueryToken());
    expect(result.current).toBe('');
  });
});
