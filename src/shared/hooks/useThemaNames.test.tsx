import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THEMA_CODES } from '@/src/shared/utils/subjects/thema-codes';
import { resetThemaNamesLoader, type ThemaNames } from '@/src/shared/utils/subjects/thema-names';
import { THEMA_NAMES_DE } from '@/src/shared/utils/subjects/thema-names-de';
import { THEMA_NAMES_ES } from '@/src/shared/utils/subjects/thema-names-es';
import { THEMA_NAMES_PT } from '@/src/shared/utils/subjects/thema-names-pt';

import { useThemaFormFields, useThemaNames } from './useThemaNames';

const mockLocale = vi.hoisted(() => vi.fn(() => 'en'));

vi.mock('@/src/shared/hooks/useActiveLocale', () => ({ default: mockLocale }));

const deferred = () => {
  let resolve: (names: ThemaNames) => void = () => {};
  const promise = new Promise<ThemaNames>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const importers = () => ({
  de: vi.fn(() => Promise.resolve(THEMA_NAMES_DE)),
  es: vi.fn(() => Promise.resolve(THEMA_NAMES_ES)),
  pt: vi.fn(() => Promise.resolve(THEMA_NAMES_PT)),
});

beforeEach(() => {
  mockLocale.mockReturnValue('en');
  resetThemaNamesLoader();
});

describe('useThemaNames (thoth-app#315)', () => {
  it('gives THEMA_CODES in English and loads nothing', async () => {
    const calls = importers();
    resetThemaNamesLoader(calls);

    const { result } = renderHook(() => useThemaNames());
    await act(async () => {});

    expect(result.current).toBe(THEMA_CODES);
    expect(calls.de).not.toHaveBeenCalled();
    expect(calls.es).not.toHaveBeenCalled();
    expect(calls.pt).not.toHaveBeenCalled();
  });

  it('gives English while German loads, then German, and German on the first render of a new mount', async () => {
    const load = deferred();
    resetThemaNamesLoader({ de: () => load.promise });
    mockLocale.mockReturnValue('de');

    const { result } = renderHook(() => useThemaNames());
    expect(result.current).toBe(THEMA_CODES);

    await act(async () => {
      load.resolve(THEMA_NAMES_DE);
    });
    expect(result.current).toBe(THEMA_NAMES_DE);

    const firstRenders: ThemaNames[] = [];
    renderHook(() => {
      const names = useThemaNames();
      firstRenders.push(names);
      return names;
    });
    expect(firstRenders[0]).toBe(THEMA_NAMES_DE);
  });

  it('follows a language switch to Spanish and back to English', async () => {
    mockLocale.mockReturnValue('de');
    const { result, rerender } = renderHook(() => useThemaNames());
    await waitFor(() => expect(result.current).toBe(THEMA_NAMES_DE));

    mockLocale.mockReturnValue('es');
    rerender();
    await waitFor(() => expect(result.current).toBe(THEMA_NAMES_ES));

    mockLocale.mockReturnValue('en');
    rerender();
    expect(result.current).toBe(THEMA_CODES);
  });

  it('keeps Spanish when a German load finishes after the switch to Spanish', async () => {
    const germanLoad = deferred();
    resetThemaNamesLoader({ de: () => germanLoad.promise });
    mockLocale.mockReturnValue('de');
    const { result, rerender } = renderHook(() => useThemaNames());

    mockLocale.mockReturnValue('es');
    rerender();
    await waitFor(() => expect(result.current).toBe(THEMA_NAMES_ES));

    await act(async () => {
      germanLoad.resolve(THEMA_NAMES_DE);
    });
    expect(result.current).toBe(THEMA_NAMES_ES);
  });

  it('keeps English when the load fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn(() => Promise.reject(new Error('offline')));
    resetThemaNamesLoader({ pt: failing });
    mockLocale.mockReturnValue('pt');

    const { result } = renderHook(() => useThemaNames());
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));

    expect(failing).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(THEMA_CODES);
    warn.mockRestore();
  });
});

describe('useThemaFormFields (thoth-app#315)', () => {
  it('gives the options of the loaded language', async () => {
    mockLocale.mockReturnValue('de');

    const { result } = renderHook(() => useThemaFormFields());
    expect(result.current.find((option) => option.value === 'AB')?.label).toBe('AB (The arts: general topics) ');

    await waitFor(() =>
      expect(result.current.find((option) => option.value === 'AB')?.label).toBe('AB (Kunst: allgemeine Themen) '),
    );
  });
});
