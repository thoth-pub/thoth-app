import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  userService: { getUser: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: { id: 'user-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', isSuperuser: false, linkedPublishers: [] }, error: null, isLoading: false, refetch: vi.fn() })),
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
  useQueryToken: vi.fn(() => 'token-123'),
}));

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: null })),
}));

import useUser from '../useUser';

function setup() {
  vi.clearAllMocks();
  mockServices.userService.getUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', isSuperuser: false, linkedPublishers: [] });
}

describe('useUser', () => {
  it('queries user', () => {
    setup();
    const { user } = useUser();
    expect(user).toBeDefined();
    expect(user.email).toBe('test@test.com');
  });
});
