/**
 * APP-ADM-01 (ADR-0010): the superuser publisher OPERATING CONTEXT lifecycle.
 *
 * This is deliberately a different lifecycle concept from the ordinary
 * publisher user's active-publisher persistence. The two may share the XState
 * machinery and the publisher-scoped query invalidation, but they must not
 * share one persistence rule: a superuser never auto-selects a publisher, never
 * inherits the ordinary `activePublisherIdKey`, enters context only through an
 * explicit action, and fails closed back to Admin when no valid staff context
 * exists. Every test below pins one of those invariants.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryKeys } from '@/src/shared/constants';

// The staff context has its own storage identity. Pinned as a literal so a
// silent reuse of the ordinary key cannot pass.
const STAFF_KEY = 'staffPublisherContextIdKey';
const ORDINARY_KEY = 'activePublisherIdKey';

const mocks = vi.hoisted(() => {
  const createPublisher = (overrides = {}) => ({
    publisherId: 'pub-1',
    publisherName: 'Publisher A',
    publisherAdmin: false,
    workLifecycle: false,
    cdnWrite: false,
    imprints: [],
    ...overrides,
  });

  return {
    createPublisher,
    user: {
      isSuperuser: true,
      linkedPublishers: [
        createPublisher(),
        createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
      ],
    },
    isAuthoritative: true,
    activePublisher: null as { id: string; name: string } | null,
    changeActivePublisher: vi.fn(),
    setLinkedPublishers: vi.fn(),
    resetLinkedPublishers: vi.fn(),
    persistentStorage: {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    router: { push: vi.fn(), replace: vi.fn() },
    queryClient: {
      resetQueries: vi.fn().mockResolvedValue(undefined),
      removeQueries: vi.fn(),
    },
  };
});

// The mocked module members are hooks, so each factory delegates to a
// use-prefixed callable rather than returning a bare object literal.
const useQueryClientMock = vi.fn(() => mocks.queryClient);
const useUserMock = vi.fn(() => ({ user: mocks.user, isAuthoritative: mocks.isAuthoritative }));
const usePublisherStateMachineMock = vi.fn(() => ({
  activePublisher: mocks.activePublisher,
  changeActivePublisher: mocks.changeActivePublisher,
  setLinkedPublishers: mocks.setLinkedPublishers,
  resetLinkedPublishers: mocks.resetLinkedPublishers,
}));
const useServicesMock = vi.fn(() => ({ persistentStorage: mocks.persistentStorage }));
const useRouterMock = vi.fn(() => mocks.router);

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => useQueryClientMock() }));

vi.mock('@/src/entities/user', () => ({ useUser: () => useUserMock() }));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: function usePublisherStateMachine() {
    return usePublisherStateMachineMock();
  },
}));

vi.mock('@/src/shared/context', () => ({ useServices: () => useServicesMock() }));

vi.mock('next/navigation', () => ({ useRouter: () => useRouterMock() }));

import usePublisherOperatingContext from './usePublisherOperatingContext';

const staffWrites = () => mocks.persistentStorage.set.mock.calls.filter(([key]) => key === STAFF_KEY);
const ordinaryWrites = () => mocks.persistentStorage.set.mock.calls.filter(([key]) => key === ORDINARY_KEY);
const ordinaryReads = () => mocks.persistentStorage.get.mock.calls.filter(([key]) => key === ORDINARY_KEY);

// The predicate handed to the query client must select exactly the existing
// publisher-scoped cache separation - no more, no less.
const capturedPredicate = () => {
  const call = mocks.queryClient.resetQueries.mock.calls.at(-1);

  return call?.[0]?.predicate as (query: { queryKey: readonly unknown[] }) => boolean;
};

beforeEach(() => {
  mocks.user.isSuperuser = true;
  mocks.user.linkedPublishers = [
    mocks.createPublisher(),
    mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
  ];
  mocks.isAuthoritative = true;
  mocks.activePublisher = null;
  mocks.persistentStorage.get.mockResolvedValue(null);
  vi.clearAllMocks();
});

describe('usePublisherOperatingContext', () => {
  describe('explicit entry (acceptance 13, 14, 23)', () => {
    it('enters the exact requested publisher from authoritative linked publishers and navigates to the workspace', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.enterPublisherContext('pub-2');
      });

      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(expect.objectContaining({ id: 'pub-2' }));
      expect(staffWrites()).toEqual([[STAFF_KEY, 'pub-2']]);
      expect(mocks.router.push).toHaveBeenCalledWith('/dashboard');
    });

    it('applies the existing publisher-scoped cache separation on entry', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.enterPublisherContext('pub-2');
      });

      expect(mocks.queryClient.resetQueries).toHaveBeenCalled();
      expect(mocks.queryClient.removeQueries).toHaveBeenCalled();

      const predicate = capturedPredicate();

      expect(predicate({ queryKey: [QueryKeys.works] })).toBe(true);
      expect(predicate({ queryKey: [QueryKeys.userInfo] })).toBe(false);
    });

    it('never writes the ordinary active-publisher key when entering staff context', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.enterPublisherContext('pub-2');
      });

      expect(ordinaryWrites()).toEqual([]);
    });

    it('fails closed and does not navigate when identity is not authoritative', async () => {
      mocks.isAuthoritative = false;

      const { result } = renderHook(() => usePublisherOperatingContext());

      let outcome;
      await act(async () => {
        outcome = await result.current.enterPublisherContext('pub-2');
      });

      expect(outcome).toBe('rejected');
      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
      expect(mocks.persistentStorage.set).not.toHaveBeenCalled();
      expect(mocks.router.push).not.toHaveBeenCalled();
    });

    it('fails closed for a publisher absent from authoritative linked publishers', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      let outcome;
      await act(async () => {
        outcome = await result.current.enterPublisherContext('pub-not-mine');
      });

      expect(outcome).toBe('rejected');
      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
      expect(mocks.persistentStorage.set).not.toHaveBeenCalled();
      expect(mocks.router.push).not.toHaveBeenCalled();
    });

    it('fails closed for an authoritative ordinary publisher user', async () => {
      mocks.user.isSuperuser = false;

      const { result } = renderHook(() => usePublisherOperatingContext());

      let outcome;
      await act(async () => {
        outcome = await result.current.enterPublisherContext('pub-2');
      });

      expect(outcome).toBe('rejected');
      expect(mocks.persistentStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('refresh restoration from the staff-specific key (acceptance 16, 19)', () => {
    it('restores the stored staff publisher and never reads the ordinary key', async () => {
      mocks.persistentStorage.get.mockResolvedValue('pub-2');

      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.restoreStaffContext();
      });

      expect(mocks.persistentStorage.get).toHaveBeenCalledWith(STAFF_KEY);
      expect(ordinaryReads()).toEqual([]);
      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(expect.objectContaining({ id: 'pub-2' }));
      expect(mocks.router.replace).not.toHaveBeenCalled();
    });

    it('clears an invalidated staff context and returns to Admin instead of selecting another publisher', async () => {
      mocks.persistentStorage.get.mockResolvedValue('pub-gone');

      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.restoreStaffContext();
      });

      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
      expect(staffWrites()).toEqual([[STAFF_KEY, null]]);
      expect(mocks.router.replace).toHaveBeenCalledWith('/admin');
    });

    it('returns to Admin when no staff context is stored at all, rather than auto-selecting the first publisher', async () => {
      mocks.persistentStorage.get.mockResolvedValue(null);

      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.restoreStaffContext();
      });

      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
      expect(mocks.router.replace).toHaveBeenCalledWith('/admin');
    });
  });

  describe('live revocation of an already-active staff context (acceptance 19)', () => {
    it('keeps an already-active staff publisher that remains in the authoritative linked-publisher set', async () => {
      mocks.activePublisher = { id: 'pub-2', name: 'Publisher B' };

      const { rerender } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        rerender();
      });

      expect(staffWrites()).toEqual([]);
      expect(mocks.resetLinkedPublishers).not.toHaveBeenCalled();
      expect(mocks.router.replace).not.toHaveBeenCalled();
    });

    it('revokes an already-active staff publisher that a later authoritative result no longer lists, without falling back to the remaining one', async () => {
      mocks.activePublisher = { id: 'pub-2', name: 'Publisher B' };

      const { rerender } = renderHook(() => usePublisherOperatingContext());

      // Still authoritative membership: nothing may be torn down yet.
      expect(staffWrites()).toEqual([]);
      expect(mocks.router.replace).not.toHaveBeenCalled();

      // A later authoritative `me` result drops pub-2 while pub-1 remains.
      mocks.user.linkedPublishers = [mocks.createPublisher()];

      await act(async () => {
        rerender();
      });

      expect(staffWrites()).toEqual([[STAFF_KEY, null]]);
      expect(mocks.resetLinkedPublishers).toHaveBeenCalled();
      expect(mocks.queryClient.resetQueries).toHaveBeenCalled();
      expect(mocks.queryClient.removeQueries).toHaveBeenCalled();
      expect(mocks.router.replace).toHaveBeenCalledWith('/admin');

      // Fail closed, never sideways: the still-authorized pub-1 is not selected.
      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
      expect(ordinaryWrites()).toEqual([]);
    });
  });

  describe('clearing (acceptance 17, 18)', () => {
    it('Return to Admin clears the staff context, resets publisher-scoped state and goes to Admin', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.returnToAdmin();
      });

      expect(staffWrites()).toEqual([[STAFF_KEY, null]]);
      expect(mocks.resetLinkedPublishers).toHaveBeenCalled();
      expect(mocks.queryClient.resetQueries).toHaveBeenCalled();
      expect(mocks.router.push).toHaveBeenCalledWith('/admin');
      expect(ordinaryWrites()).toEqual([]);
    });

    it('clearStaffContext clears the staff key without navigating anywhere', async () => {
      const { result } = renderHook(() => usePublisherOperatingContext());

      await act(async () => {
        await result.current.clearStaffContext();
      });

      expect(staffWrites()).toEqual([[STAFF_KEY, null]]);
      expect(mocks.router.push).not.toHaveBeenCalled();
      expect(mocks.router.replace).not.toHaveBeenCalled();
    });
  });
});
