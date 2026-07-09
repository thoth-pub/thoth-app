import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useDebounceValue from './useDebouncedValue';

describe('useDebounceValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounceValue('hello'));
    expect(result.current).toBe('hello');
  });

  it('should update the debounced value after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounceValue(value, 500), {
      initialProps: { value: 'hello' },
    });

    expect(result.current).toBe('hello');

    rerender({ value: 'world' });
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('world');
  });

  it('should reset the timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounceValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('c');
  });

  it('should use default delay of 0', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounceValue(value), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });

    act(() => { vi.runAllTimers(); });
    expect(result.current).toBe('second');
  });
});
