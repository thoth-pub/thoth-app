import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useProgress from './useProgress';

describe('useProgress', () => {
  it('should start with null progress', () => {
    const { result } = renderHook(() => useProgress());

    expect(result.current.progress).toBeNull();
  });

  it('should set progress to 0 on startProgress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.startProgress();
    });

    expect(result.current.progress).toBe(0);
  });

  it('should update progress via setProgress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setProgress(50);
    });

    expect(result.current.progress).toBe(50);
  });

  it('should reset progress to null on resetProgress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.startProgress();
      result.current.resetProgress();
    });

    expect(result.current.progress).toBeNull();
  });
});
