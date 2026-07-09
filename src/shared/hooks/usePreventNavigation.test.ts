import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import usePreventNavigation from './usePreventNavigation';

describe('usePreventNavigation', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add beforeunload listener when shouldPrevent is true', () => {
    renderHook(() => usePreventNavigation(true));

    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should not add beforeunload listener when shouldPrevent is false', () => {
    renderHook(() => usePreventNavigation(false));

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('should remove beforeunload listener on unmount', () => {
    const { unmount } = renderHook(() => usePreventNavigation(true));

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('preventDefault should be called on the beforeunload event', () => {
    renderHook(() => usePreventNavigation(true));

    const event = new Event('beforeunload');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
