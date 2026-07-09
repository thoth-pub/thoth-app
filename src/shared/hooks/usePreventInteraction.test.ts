import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import usePreventInteraction from './usePreventInteraction';

describe('usePreventInteraction', () => {
  beforeEach(() => {
    document.body.style.pointerEvents = '';
  });

  it('should set pointer-events to none when shouldPrevent is true', () => {
    renderHook(() => usePreventInteraction(true));

    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('should not set pointer-events when shouldPrevent is false', () => {
    renderHook(() => usePreventInteraction(false));

    expect(document.body.style.pointerEvents).toBe('');
  });

  it('should restore pointer-events on unmount', () => {
    const { unmount } = renderHook(() => usePreventInteraction(true));

    expect(document.body.style.pointerEvents).toBe('none');

    unmount();

    expect(document.body.style.pointerEvents).toBe('');
  });
});
