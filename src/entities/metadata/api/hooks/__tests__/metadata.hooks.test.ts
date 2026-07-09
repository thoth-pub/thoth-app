import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  metadataService: { getAllSpecifications: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: {}, isLoading: false, error: null })),
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

import { useMetaData } from '../useMetaData';

const WORK_ID = 'work-1';

function setup() {
  vi.clearAllMocks();
  mockServices.metadataService.getAllSpecifications.mockResolvedValue({});
}

describe('useMetaData', () => {
  it('queries metadata for work', () => {
    setup();
    const { data } = useMetaData(WORK_ID);
    expect(data).toBeDefined();
  });
});
