import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryKeys } from '@/src/shared/constants';

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

  const publishers = [
    createPublisher(),
    createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
  ];

  return {
    createPublisher,
    publishers,
    user: {
      linkedPublishers: [...publishers],
      isSuperuser: false,
    },
    loading: false,
    activePublisher: { id: 'pub-1', name: 'Publisher A' },
    changeActivePublisher: vi.fn(),
    resetLinkedPublishers: vi.fn(),
    setLinkedPublishers: vi.fn(),
    persistentStorage: {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue('pub-1'),
    },
    pathname: '/dashboard',
    router: { push: vi.fn() },
    queryClient: { removeQueries: vi.fn() },
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ user: mocks.user, loading: mocks.loading }),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => ({
    activePublisher: mocks.activePublisher,
    changeActivePublisher: mocks.changeActivePublisher,
    resetLinkedPublishers: mocks.resetLinkedPublishers,
    setLinkedPublishers: mocks.setLinkedPublishers,
  }),
}));

vi.mock('@/src/shared/context', () => ({
  useServices: () => ({
    persistentStorage: mocks.persistentStorage,
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

import { useChangeActivePublisher } from './useChangeActivePublisher';

describe('useChangeActivePublisher', () => {
  beforeEach(() => {
    mocks.activePublisher = { id: 'pub-1', name: 'Publisher A' };
    mocks.loading = false;
    mocks.pathname = '/dashboard';
    mocks.user.linkedPublishers = [
      mocks.createPublisher(),
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];
    mocks.persistentStorage.get.mockResolvedValue('pub-1');
    mocks.changeActivePublisher.mockClear();
    mocks.resetLinkedPublishers.mockClear();
    mocks.setLinkedPublishers.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.persistentStorage.get.mockClear();
    mocks.router.push.mockClear();
    mocks.queryClient.removeQueries.mockClear();
  });

  it('should return active publisher', () => {
    const { result } = renderHook(() => useChangeActivePublisher({}));

    expect(result.current.activePublisher).toBe(mocks.activePublisher);
  });

  it('should build publisher options from linked publishers', () => {
    const { result } = renderHook(() => useChangeActivePublisher({}));

    expect(result.current.publishersOptions).toHaveLength(2);
  });

  it('should hide selector when only one publisher or isHidden is true', () => {
    mocks.user.linkedPublishers = [mocks.publishers[0]];

    const { result } = renderHook(() => useChangeActivePublisher({}));

    expect(result.current.hideSelector).toBe(true);
  });

  it('should hide selector when isHidden is true', () => {
    const { result } = renderHook(() => useChangeActivePublisher({ isHidden: true }));

    expect(result.current.hideSelector).toBe(true);
  });

  it('should initialize active publisher when none exists', async () => {
    mocks.activePublisher = null;
    mocks.persistentStorage.get.mockResolvedValue(null);

    renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pub-1', name: 'Publisher A' }),
        ]),
        false,
      );
    });

    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pub-1', name: 'Publisher A' }),
    );
    expect(mocks.changeActivePublisher).toHaveBeenCalledTimes(1);
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-1');
    expect(mocks.persistentStorage.set).toHaveBeenCalledTimes(1);
  });

  it('useChangeActivePublisher_restoresValidPersistedPublisher', async () => {
    mocks.activePublisher = null;
    mocks.persistentStorage.get.mockResolvedValue('pub-2');

    renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-2', name: 'Publisher B' }),
      );
    });
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-2');
  });

  it('useChangeActivePublisher_fallsBackWhenPersistedPublisherIsStale', async () => {
    mocks.activePublisher = null;
    mocks.persistentStorage.get.mockResolvedValue('revoked-publisher');

    renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-1', name: 'Publisher A' }),
      );
    });
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-1');
  });

  it('should not initialize when there are no linked publishers', async () => {
    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [];

    renderHook(() => useChangeActivePublisher({}));

    await act(async () => {});

    expect(mocks.setLinkedPublishers).not.toHaveBeenCalled();
    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
    expect(mocks.persistentStorage.get).not.toHaveBeenCalled();
  });

  it('useChangeActivePublisher_initialLoadedEmptyThenPublishersArrive_selectsActivePublisher', async () => {
    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [];

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await act(async () => {});
    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();

    mocks.user.linkedPublishers = [
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];
    rerender();

    const publisherB = expect.objectContaining({ id: 'pub-2', name: 'Publisher B' });

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith([publisherB], false);
    });
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(publisherB);
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-2');
  });

  it('useChangeActivePublisher_pendingInitialReadDoesNotOverrideExplicitSwitch', async () => {
    let resolveInitialRead: (publisherId: string | null) => void = () => {};

    mocks.activePublisher = null;
    mocks.persistentStorage.get.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialRead = resolve;
      }),
    );

    const { result } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.updateActivePublisher('pub-2');
    });
    await act(async () => {
      resolveInitialRead('pub-1');
    });

    expect(mocks.changeActivePublisher).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'pub-2' }),
    );
    expect(mocks.changeActivePublisher).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pub-1' }),
    );
    expect(mocks.persistentStorage.set).toHaveBeenLastCalledWith(expect.any(String), 'pub-2');
    expect(mocks.persistentStorage.set).not.toHaveBeenCalledWith(expect.any(String), 'pub-1');
  });

  it('useChangeActivePublisher_pendingInitialReadDoesNotRestoreRevokedPublisher', async () => {
    let resolveInitialRead: (publisherId: string | null) => void = () => {};

    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [mocks.createPublisher()];
    mocks.persistentStorage.get.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialRead = resolve;
      }),
    );

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.user.linkedPublishers = [
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];
    rerender();

    await waitFor(() => {
      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-2' }),
      );
    });
    await act(async () => {
      resolveInitialRead('pub-1');
    });

    expect(mocks.changeActivePublisher).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pub-1' }),
    );
    expect(mocks.persistentStorage.set).toHaveBeenLastCalledWith(expect.any(String), 'pub-2');
    expect(mocks.persistentStorage.set).not.toHaveBeenCalledWith(expect.any(String), 'pub-1');
  });

  it('useChangeActivePublisher_pendingInitialReadDoesNotOverrideFullRevocationReset', async () => {
    let resolveInitialRead: (publisherId: string | null) => void = () => {};

    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [mocks.createPublisher()];
    mocks.persistentStorage.get.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialRead = resolve;
      }),
    );

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.user.linkedPublishers = [];
    rerender();

    await waitFor(() => {
      expect(mocks.resetLinkedPublishers).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      resolveInitialRead('pub-1');
    });

    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), null);
    expect(mocks.persistentStorage.set).not.toHaveBeenCalledWith(expect.any(String), 'pub-1');
  });

  it('useChangeActivePublisher_retriesInitializationAfterPendingReadResolvesDuringTransientEmptyState', async () => {
    let resolveInitialRead: (publisherId: string | null) => void = () => {};

    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [mocks.createPublisher()];
    mocks.persistentStorage.get.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialRead = resolve;
      }),
    );

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.loading = true;
    mocks.user.linkedPublishers = [];
    rerender();

    await act(async () => {
      resolveInitialRead('pub-1');
    });
    expect(mocks.resetLinkedPublishers).not.toHaveBeenCalled();
    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();

    mocks.loading = false;
    mocks.user.linkedPublishers = [mocks.createPublisher()];
    rerender();

    await waitFor(() => {
      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-1' }),
      );
    });
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-1');
  });

  it('useChangeActivePublisher_marksInitializedWhenActivePublisherAlreadyExists', async () => {
    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.setLinkedPublishers.mockClear();
    mocks.changeActivePublisher.mockClear();
    mocks.user.linkedPublishers = [
      mocks.createPublisher({ publisherId: 'pub-1', publisherName: 'Publisher A updated' }),
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];

    rerender();

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pub-1', name: 'Publisher A updated' }),
        ]),
        false,
      );
    });
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pub-1', name: 'Publisher A updated' }),
    );
    expect(mocks.persistentStorage.get).not.toHaveBeenCalled();
  });

  it('useChangeActivePublisher_syncsPermissionChangesAfterRemount', async () => {
    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.setLinkedPublishers.mockClear();
    mocks.changeActivePublisher.mockClear();
    mocks.queryClient.removeQueries.mockClear();
    mocks.pathname = '/admin/works/550e8400-e29b-41d4-a716-446655440000';

    const updatedImprints = [{ id: 'imprint-1', name: 'Updated Imprint' }];
    mocks.user.linkedPublishers = [
      mocks.createPublisher({
        publisherId: 'pub-1',
        publisherName: 'Publisher A',
        publisherAdmin: true,
        workLifecycle: true,
        cdnWrite: true,
        imprints: updatedImprints,
      }),
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];

    rerender();

    const updatedPublisher = expect.objectContaining({
      id: 'pub-1',
      name: 'Publisher A',
      publisherAdmin: true,
      workLifecycle: true,
      cdnWrite: true,
      imprints: updatedImprints,
    });

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith(
        expect.arrayContaining([updatedPublisher]),
        false,
      );
    });
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(updatedPublisher);
    expect(mocks.queryClient.removeQueries).not.toHaveBeenCalled();
    expect(mocks.persistentStorage.set).not.toHaveBeenCalled();
    expect(mocks.router.push).not.toHaveBeenCalled();
  });

  it('useChangeActivePublisher_preservesSwitchSideEffectsWhenCurrentAccessRevoked', async () => {
    mocks.pathname = '/admin/works/550e8400-e29b-41d4-a716-446655440000';

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.setLinkedPublishers.mockClear();
    mocks.changeActivePublisher.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.queryClient.removeQueries.mockClear();
    mocks.user.linkedPublishers = [
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];

    rerender();

    const publisherB = expect.objectContaining({ id: 'pub-2', name: 'Publisher B' });

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith([publisherB], false);
    });
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(publisherB);
    expect(mocks.changeActivePublisher).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pub-1' }),
    );
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(
      expect.any(String),
      'pub-2',
    );
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);
    expect(mocks.router.push).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('useChangeActivePublisher_selectsActivePublisherWhenAccessReturnsAfterEmpty', async () => {
    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.user.linkedPublishers = [];
    rerender();

    await waitFor(() => {
      expect(mocks.resetLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.activePublisher = null;
    mocks.user.linkedPublishers = [
      mocks.createPublisher({ publisherId: 'pub-2', publisherName: 'Publisher B' }),
    ];
    mocks.setLinkedPublishers.mockClear();
    mocks.changeActivePublisher.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.queryClient.removeQueries.mockClear();

    rerender();

    const publisherB = expect.objectContaining({ id: 'pub-2', name: 'Publisher B' });

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledWith([publisherB], false);
    });
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(publisherB);
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), 'pub-2');
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);
  });

  it('useChangeActivePublisher_clearsActivePublisherWhenNoPublishersRemain', async () => {
    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.resetLinkedPublishers.mockClear();
    mocks.changeActivePublisher.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.queryClient.removeQueries.mockClear();
    mocks.user.linkedPublishers = [];

    rerender();

    await waitFor(() => {
      expect(mocks.resetLinkedPublishers).toHaveBeenCalledTimes(1);
    });
    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), null);
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);
  });

  it('useChangeActivePublisher_fullRevocationClearsPublisherScopedCacheAndRedirectsFromEditRoute', async () => {
    mocks.pathname = '/admin/works/550e8400-e29b-41d4-a716-446655440000';

    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.resetLinkedPublishers.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.queryClient.removeQueries.mockClear();
    mocks.router.push.mockClear();
    mocks.user.linkedPublishers = [];
    rerender();

    await waitFor(() => {
      expect(mocks.resetLinkedPublishers).toHaveBeenCalledTimes(1);
    });
    expect(mocks.persistentStorage.set).toHaveBeenCalledWith(expect.any(String), null);
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);

    const { predicate } = mocks.queryClient.removeQueries.mock.calls[0][0];

    expect(predicate({ queryKey: [QueryKeys.userInfo, 'token'] })).toBe(false);
    expect(predicate({ queryKey: [QueryKeys.work, 'work-id'] })).toBe(true);
    expect(mocks.router.push).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('useChangeActivePublisher_doesNotResetPublishersDuringUserRefetchEmptyState', async () => {
    const { rerender } = renderHook(() => useChangeActivePublisher({}));

    await waitFor(() => {
      expect(mocks.setLinkedPublishers).toHaveBeenCalledTimes(1);
    });

    mocks.resetLinkedPublishers.mockClear();
    mocks.persistentStorage.set.mockClear();
    mocks.loading = true;
    mocks.user.linkedPublishers = [];

    rerender();
    await act(async () => {});

    expect(mocks.resetLinkedPublishers).not.toHaveBeenCalled();
    expect(mocks.persistentStorage.set).not.toHaveBeenCalledWith(expect.any(String), null);
    expect(mocks.queryClient.removeQueries).not.toHaveBeenCalled();
    expect(mocks.router.push).not.toHaveBeenCalled();
  });

  describe('updateActivePublisher', () => {
    it('useChangeActivePublisher_doesNotClearUserInfoQueryOnPublisherSwitch', async () => {
      const { result } = renderHook(() => useChangeActivePublisher({}));

      await act(async () => {
        await result.current.updateActivePublisher('pub-2');
      });

      expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);

      const { predicate } = mocks.queryClient.removeQueries.mock.calls[0][0];

      expect(predicate({ queryKey: [QueryKeys.userInfo, 'token'] })).toBe(false);
      expect(predicate({ queryKey: [QueryKeys.works, 'pub-2'] })).toBe(true);
    });

    it('should change active publisher and persist to storage', async () => {
      const { result } = renderHook(() => useChangeActivePublisher({}));

      await act(async () => {
        await result.current.updateActivePublisher('pub-2');
      });

      expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-2' }),
      );
      expect(mocks.persistentStorage.set).toHaveBeenCalledWith(
        expect.any(String),
        'pub-2',
      );
    });

    it('should redirect to dashboard when editing a work', async () => {
      mocks.pathname = '/works/550e8400-e29b-41d4-a716-446655440000';

      const { result } = renderHook(() => useChangeActivePublisher({}));

      await act(async () => {
        await result.current.updateActivePublisher('pub-2');
      });

      expect(mocks.router.push).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should skip redirect when skipRedirect is true', async () => {
      const { result } = renderHook(() => useChangeActivePublisher({}));

      await act(async () => {
        await result.current.updateActivePublisher('pub-2', true);
      });

      expect(mocks.router.push).not.toHaveBeenCalled();
    });

    it('should do nothing when publisher is not found', async () => {
      const { result } = renderHook(() => useChangeActivePublisher({}));

      await waitFor(() => {
        expect(mocks.changeActivePublisher).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'pub-1' }),
        );
      });
      mocks.changeActivePublisher.mockClear();

      await act(async () => {
        await result.current.updateActivePublisher('non-existent');
      });

      expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
    });
  });
});
