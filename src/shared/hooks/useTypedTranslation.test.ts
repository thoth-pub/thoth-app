import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { beforeEach } from 'vitest';

const mockT = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

import useTypedTranslation from './useTypedTranslation';

describe('useTypedTranslation', () => {
  it('should return a t function', () => {
    const { result } = renderHook(() => useTypedTranslation({ namespace: 'common' as never }));
    expect(typeof result.current.t).toBe('function');
  });

  it('should call the underlying t when returned t is used', () => {
    mockT.mockReturnValue('translated');

    const { result } = renderHook(() => useTypedTranslation({ namespace: 'common' as never }));
    const translated = result.current.t('some.key' as never);

    expect(mockT).toHaveBeenCalledWith('some.key');
    expect(translated).toBe('translated');
  });

  it('should pass options to the underlying t', () => {
    mockT.mockReturnValue('translated');

    const { result } = renderHook(() => useTypedTranslation({ namespace: 'common' as never }));
    result.current.t('some.key' as never, { count: 5 });

    expect(mockT).toHaveBeenCalledWith('some.key', { count: 5 });
  });
});
