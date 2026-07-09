import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useEscapeKey from './useEscapeKey';

describe('useEscapeKey', () => {
  it('should call onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();

    renderHook(() => useEscapeKey(onEscape, true));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should not call onEscape when enabled is false', () => {
    const onEscape = vi.fn();

    renderHook(() => useEscapeKey(onEscape, false));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should not call onEscape for non-Escape keys', () => {
    const onEscape = vi.fn();

    renderHook(() => useEscapeKey(onEscape, true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should not call onEscape when onEscape is undefined', () => {
    renderHook(() => useEscapeKey(undefined, true));

    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }).not.toThrow();
  });

  it('should remove event listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onEscape, true));

    unmount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onEscape).not.toHaveBeenCalled();
  });
});
