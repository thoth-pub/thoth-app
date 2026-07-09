import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  institutionService: { getInstitutions: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: undefined, error: null, isLoading: false })),
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
}));

import useInstitutions from '../useInstitutions';

function setup() {
  vi.clearAllMocks();
  mockServices.institutionService.getInstitutions.mockResolvedValue([]);
}

describe('useInstitutions', () => {
  it('queries institutions with filter', () => {
    setup();
    const { institutions } = useInstitutions({ filter: 'University' });
    expect(institutions).toEqual([]);
  });
});
