import { describe, expect, it, vi } from 'vitest';

import { appConfig } from '@/src/shared/config';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  institutionService: { getInstitutions: vi.fn() },
};
const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: mockUseQuery,
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
  mockUseQuery.mockReturnValue({ data: undefined, error: null, isLoading: false });
}

describe('useInstitutions', () => {
  it.each(['University', 'https://ror.org/012345678'])('queries institutions with filter %s', async (filter) => {
    setup();
    const { institutions } = useInstitutions({ filter });
    expect(institutions).toEqual([]);

    const queryOptions = mockUseQuery.mock.calls[0]?.[0] as {
      queryFn: () => Promise<unknown>;
      enabled: boolean;
    };

    expect(queryOptions.enabled).toBe(true);

    await queryOptions.queryFn();

    expect(mockServices.institutionService.getInstitutions).toHaveBeenCalledWith(
      0,
      appConfig.data.maxItemsPerRequestLimit,
      filter,
    );
  });
});
