import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useIsDragStarted from './useIsDragStarted';

describe('useIsDragStarted', () => {
  it('should start with false', () => {
    const { result } = renderHook(() => useIsDragStarted());
    expect(result.current).toBe(false);
  });

  it('should set to true on dragover', () => {
    const { result } = renderHook(() => useIsDragStarted());

    act(() => {
      window.dispatchEvent(new Event('dragover'));
    });

    expect(result.current).toBe(true);
  });

  it('should set to false on dragleave', () => {
    const { result } = renderHook(() => useIsDragStarted());

    act(() => {
      window.dispatchEvent(new Event('dragover'));
    });

    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('dragleave'));
    });

    expect(result.current).toBe(false);
  });

  it('should set to false on drop', () => {
    const { result } = renderHook(() => useIsDragStarted());

    act(() => {
      window.dispatchEvent(new Event('dragover'));
    });

    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('drop'));
    });

    expect(result.current).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useIsDragStarted());

    unmount();

    act(() => {
      window.dispatchEvent(new Event('dragover'));
    });

    expect(result.current).toBe(false);
  });
});
