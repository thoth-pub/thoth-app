import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useEntityList from './useEntityList';

describe('useEntityList', () => {
  it('should return default values when no props provided', () => {
    const { result } = renderHook(() => useEntityList({}));

    expect(result.current.activePage).toBe(1);
    expect(result.current.offset).toBe(0);
    expect(result.current.searchValue).toBe('');
    expect(result.current.debouncedValue).toBe('');
    expect(result.current.limit).toBeGreaterThan(0);
  });

  it('should allow changing page', () => {
    const { result } = renderHook(() => useEntityList({}));

    act(() => {
      result.current.changePage(3);
    });

    expect(result.current.activePage).toBe(3);
    expect(result.current.offset).toBeGreaterThan(0);
  });

  it('should allow changing direction', () => {
    const { result } = renderHook(() => useEntityList({}));

    act(() => {
      result.current.changeDirection('DESC' as any);
    });

    expect(result.current.direction).toBe('DESC');
  });

  it('should allow changing orderBy', () => {
    const { result } = renderHook(() => useEntityList({}));

    act(() => {
      result.current.changeOrderBy('TITLE' as any);
    });

    expect(result.current.orderBy).toBe('TITLE');
  });

  it('should allow changing search value', () => {
    const { result } = renderHook(() => useEntityList({}));

    act(() => {
      result.current.changeSearchValue('test');
    });

    expect(result.current.searchValue).toBe('test');
  });

  it('should accept initial values', () => {
    const { result } = renderHook(() =>
      useEntityList({
        initialActivePage: 5,
        initialDirection: 'DESC' as any,
        initialOrderBy: 'TITLE' as any,
        initialSearchValue: 'search',
      }),
    );

    expect(result.current.activePage).toBe(5);
    expect(result.current.direction).toBe('DESC');
    expect(result.current.orderBy).toBe('TITLE');
    expect(result.current.searchValue).toBe('search');
  });
});
