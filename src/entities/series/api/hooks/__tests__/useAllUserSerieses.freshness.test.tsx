import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
  APP-IMPORT-SERIES-FRESH-01 (thoth-app#317): the importer's own read of the user's Series, against a real QueryClient
  with the app's query defaults. The read goes to the service directly: it never answers from the cache, and never
  changes what the cache holds.
*/

const { getAllSerieses, identity } = vi.hoisted(() => ({
  getAllSerieses: vi.fn(),
  identity: {
    settledUser: null as { isSuperuser: boolean; linkedPublishers: { publisherId: string; imprints: [] }[] } | null,
  },
}));

vi.mock('@/src/shared/context', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useServices: () => ({ seriesService: { getAllSerieses } }),
}));

vi.mock('@/src/entities/user', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useUser: () => ({ identitySettled: identity.settledUser !== null, settledUser: identity.settledUser }),
}));

import { appConfig } from '@/src/shared/config';
import { QueryKeys } from '@/src/shared/constants';

import type { SeriesService } from '../../series.service';
import useAllUserSerieses, { readAllUserSerieses } from '../useAllUserSerieses';

const KEY = [QueryKeys.allUserSerieses, 'pub-1'];
const CACHED = [{ id: 'series-cached', name: 'Cached Series' }];
const FRESH = [
  { id: 'series-cached', name: 'Cached Series' },
  { id: 'series-new', name: 'Created since' },
];

const settledOn = (...publisherIds: string[]) => ({
  isSuperuser: false,
  linkedPublishers: publisherIds.map((publisherId) => ({ publisherId, imprints: [] as [] })),
});

const renderWith = (client: QueryClient) =>
  renderHook(() => useAllUserSerieses(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

/** Lets the query's own work, if any, start and settle. */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('useAllUserSerieses: the importer read', () => {
  let client: QueryClient;

  beforeEach(() => {
    getAllSerieses.mockReset();
    identity.settledUser = settledOn('pub-1');
    client = new QueryClient({ defaultOptions: { queries: appConfig.query } });
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  it('H-1: makes exactly one service call with the given ids and resolves with its result, ignoring and keeping a fresh cached list', async () => {
    client.setQueryData(KEY, CACHED);
    const { result } = renderWith(client);
    await flush();
    // The cached list is fresh, so the query itself reads nothing.
    expect(getAllSerieses).not.toHaveBeenCalled();
    const before = client.getQueryState(KEY);

    getAllSerieses.mockResolvedValueOnce(FRESH);
    let list: unknown;
    await act(async () => {
      list = await result.current.readSerieses(['pub-1']);
    });
    await flush();

    expect(getAllSerieses).toHaveBeenCalledTimes(1);
    expect(getAllSerieses).toHaveBeenCalledWith({ publishersIds: ['pub-1'] });
    expect(list).toBe(FRESH);
    expect(client.getQueryData(KEY)).toBe(CACHED);
    expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(before?.dataUpdatedAt);
    expect(client.getQueryState(KEY)?.fetchStatus).toBe('idle');
    expect(result.current.serieses).toBe(CACHED);
  });

  it('H-2: refuses an empty id list with no service call', async () => {
    const { result } = renderWith(client);
    await flush();
    getAllSerieses.mockClear();

    await expect(result.current.readSerieses([])).rejects.toThrow();
    await expect(readAllUserSerieses({ getAllSerieses } as unknown as SeriesService, [])).rejects.toThrow();

    expect(getAllSerieses).not.toHaveBeenCalled();
  });

  it('H-3: passes a service rejection on', async () => {
    client.setQueryData(KEY, CACHED);
    const { result } = renderWith(client);
    await flush();
    const failure = new Error('serieses failed');
    getAllSerieses.mockRejectedValueOnce(failure);

    await expect(result.current.readSerieses(['pub-1'])).rejects.toBe(failure);
    expect(getAllSerieses).toHaveBeenCalledTimes(1);
  });

  it('exposes the settled linked-publisher set, an empty set for a settled user with none, and null while unsettled', async () => {
    client.setQueryData(KEY, CACHED);
    const settled = renderWith(client);
    await flush();
    expect(settled.result.current.settledPublishersIds).toEqual(['pub-1']);
    cleanup();

    identity.settledUser = settledOn();
    const none = renderWith(client);
    await flush();
    expect(none.result.current.settledPublishersIds).toEqual([]);
    cleanup();

    identity.settledUser = null;
    const unsettled = renderWith(client);
    await flush();
    expect(unsettled.result.current.settledPublishersIds).toBeNull();
    expect(unsettled.result.current.loading).toBe(true);
    expect(getAllSerieses).not.toHaveBeenCalled();
  });
});
