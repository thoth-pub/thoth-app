import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockQueryToken = vi.hoisted(() => vi.fn(() => 'token-123'));
const mockServices = {
  userService: { getUser: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: { id: 'user-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', isSuperuser: false, linkedPublishers: [] }, error: null, isFetching: false, isLoading: false, isSuccess: true, refetch: vi.fn() })),
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
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: null })),
}));

import useUser from '../useUser';

function setup() {
  vi.clearAllMocks();
  mockQueryToken.mockReturnValue('token-123');
  mockServices.userService.getUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', isSuperuser: false, linkedPublishers: [] });
}

describe('useUser', () => {
  it('queries user', () => {
    setup();
    const { user, isAuthoritative } = useUser();
    expect(user).toBeDefined();
    expect(user.email).toBe('test@test.com');
    expect(isAuthoritative).toBe(true);
  });

  it('does not expose default user data as authoritative without a query token', () => {
    setup();
    mockQueryToken.mockReturnValue('');

    const { isAuthoritative } = useUser();

    expect(isAuthoritative).toBe(false);
  });
});
