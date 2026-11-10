import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockQueryToken = vi.hoisted(() => vi.fn(() => 'token-123'));
const mockServices = {
  userService: { getUser: vi.fn() },
};

const imprint = (id: string, name: string) => ({
  id,
  name,
  url: '',
  updatedAt: '',
  crossmarkDoi: '',
  defaultCurrency: 'GBP',
  defaultLocale: 'EN',
  defaultPlace: 'London',
});

const makeUser = (id: string, imprints = [imprint('imprint-1', 'Imprint One')]) => ({
  id,
  email: `${id}@test.com`,
  firstName: 'John',
  lastName: 'Doe',
  isSuperuser: false,
  linkedPublishers: [
    {
      publisherId: 'publisher-1',
      publisherName: 'Publisher One',
      publisherAdmin: false,
      workLifecycle: false,
      cdnWrite: false,
      imprints,
    },
  ],
});

type QueryState = {
  data: ReturnType<typeof makeUser> | undefined;
  error: Error | null;
  isFetching: boolean;
  isLoading: boolean;
  isSuccess: boolean;
};

const settledQuery = (data: ReturnType<typeof makeUser>): QueryState => ({
  data,
  error: null,
  isFetching: false,
  isLoading: false,
  isSuccess: true,
});

const mockQuery = vi.hoisted(() => ({ state: null as unknown }));
const mockActivePublisher = vi.hoisted(() => ({ value: null as { id: string } | null }));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ ...(mockQuery.state as QueryState), refetch: vi.fn() })),
}));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => mockServices),
  ServicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({
    sendErrorNotification: mockSendError,
    sendSuccessNotification: mockSendSuccess,
    sendProgressNotification: vi.fn(),
    dismissNotification: vi.fn(),
  })),
  useQueryToken: mockQueryToken,
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: mockActivePublisher.value })),
}));

import useUser from '../useUser';

const userOne = makeUser('user-1');

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryToken.mockReturnValue('token-123');
  mockQuery.state = settledQuery(userOne);
  mockActivePublisher.value = null;
});

describe('useUser', () => {
  it('queries user', () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.user).toBeDefined();
    expect(result.current.user.email).toBe('user-1@test.com');
    expect(result.current.isAuthoritative).toBe(true);
  });

  it('does not expose default user data as authoritative without a query token', () => {
    mockQueryToken.mockReturnValue('');
    mockQuery.state = { data: undefined, error: null, isFetching: false, isLoading: false, isSuccess: false };

    const { result } = renderHook(() => useUser());

    expect(result.current.isAuthoritative).toBe(false);
  });
});

describe('useUser settled identity (APP-AUTH-IDENTITY-FORMS-01)', () => {
  it('is not settled while `me` is still loading', () => {
    mockQuery.state = { data: undefined, error: null, isFetching: true, isLoading: true, isSuccess: false };

    const { result } = renderHook(() => useUser());

    expect(result.current.identitySettled).toBe(false);
    expect(result.current.settledUser).toBeNull();
    expect(result.current.settledImprints).toEqual([]);
    expect(result.current.settledImprintsOptions).toEqual([]);
  });

  it('settles on authoritative `me` and offers the active publisher imprints', () => {
    mockActivePublisher.value = { id: 'publisher-1' };

    const { result } = renderHook(() => useUser());

    expect(result.current.identitySettled).toBe(true);
    expect(result.current.settledUser).toBe(userOne);
    expect(result.current.settledImprints.map(({ id }) => id)).toEqual(['imprint-1']);
    expect(result.current.settledImprintsOptions).toEqual([{ value: 'imprint-1', label: 'Imprint One' }]);
    // The existing fields keep their meaning.
    expect(result.current.userImprintsOptions).toEqual([{ value: 'imprint-1', label: 'Imprint One' }]);
  });

  it('does not settle on a cached `me` that is being refetched before it first settled', () => {
    mockQuery.state = { ...settledQuery(userOne), isFetching: true };

    const { result } = renderHook(() => useUser());

    expect(result.current.isAuthoritative).toBe(false);
    expect(result.current.identitySettled).toBe(false);
  });

  it('keeps the settled identity through a background refetch', () => {
    mockActivePublisher.value = { id: 'publisher-1' };
    const { result, rerender } = renderHook(() => useUser());

    mockQuery.state = { ...settledQuery(userOne), isFetching: true };
    rerender();

    expect(result.current.isAuthoritative).toBe(false);
    expect(result.current.identitySettled).toBe(true);
    expect(result.current.settledUser).toBe(userOne);
    expect(result.current.settledImprintsOptions).toEqual([{ value: 'imprint-1', label: 'Imprint One' }]);
  });

  it('keeps the settled identity through a token rotation for the same user', () => {
    mockActivePublisher.value = { id: 'publisher-1' };
    const { result, rerender } = renderHook(() => useUser());

    // A rotated token is a new query: no data yet, so `user` falls back to the empty default.
    mockQueryToken.mockReturnValue('token-456');
    mockQuery.state = { data: undefined, error: null, isFetching: true, isLoading: true, isSuccess: false };
    rerender();

    expect(result.current.user.linkedPublishers).toEqual([]);
    expect(result.current.userImprintsOptions).toEqual([]);
    expect(result.current.identitySettled).toBe(true);
    expect(result.current.settledImprintsOptions).toEqual([{ value: 'imprint-1', label: 'Imprint One' }]);

    const refreshedUserOne = makeUser('user-1', [imprint('imprint-1', 'Imprint One'), imprint('imprint-2', 'Two')]);
    mockQuery.state = settledQuery(refreshedUserOne);
    rerender();

    expect(result.current.settledUser).toBe(refreshedUserOne);
    expect(result.current.settledImprintsOptions.map(({ value }) => value)).toEqual(['imprint-1', 'imprint-2']);
  });

  it('drops the settled identity when `me` fails', () => {
    const { result, rerender } = renderHook(() => useUser());

    mockQuery.state = { ...settledQuery(userOne), error: new Error('me failed'), isSuccess: false };
    rerender();

    expect(result.current.identitySettled).toBe(false);
    expect(result.current.settledUser).toBeNull();
    expect(result.current.settledImprintsOptions).toEqual([]);
  });

  it('drops the settled identity once the token is withheld after RefreshAccessTokenError', () => {
    const { result, rerender } = renderHook(() => useUser());

    // useQueryToken returns '' once the session carries RefreshAccessTokenError, which disables `me`.
    mockQueryToken.mockReturnValue('');
    mockQuery.state = { data: undefined, error: null, isFetching: false, isLoading: false, isSuccess: false };
    rerender();

    expect(result.current.identitySettled).toBe(false);
    expect(result.current.settledUser).toBeNull();
  });

  it('settles again after a loss only on a new authoritative `me`', () => {
    const { result, rerender } = renderHook(() => useUser());

    mockQuery.state = { ...settledQuery(userOne), error: new Error('me failed'), isSuccess: false };
    rerender();
    mockQuery.state = { ...settledQuery(userOne), error: null, isFetching: true };
    rerender();

    expect(result.current.identitySettled).toBe(false);

    mockQuery.state = settledQuery(userOne);
    rerender();

    expect(result.current.identitySettled).toBe(true);
  });

  it('replaces the settled identity when `me` settles on a different user', () => {
    const { result, rerender } = renderHook(() => useUser());

    const userTwo = makeUser('user-2', [imprint('imprint-9', 'Other Imprint')]);
    mockQueryToken.mockReturnValue('token-other');
    mockQuery.state = { data: undefined, error: null, isFetching: true, isLoading: true, isSuccess: false };
    rerender();

    expect(result.current.settledUser).toBe(userOne);

    mockQuery.state = settledQuery(userTwo);
    rerender();

    expect(result.current.settledUser).toBe(userTwo);
    expect(result.current.settledUser?.id).toBe('user-2');
  });
});
