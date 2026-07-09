import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  titleService: { createTitle: vi.fn(), updateTitle: vi.fn(), deleteTitle: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.();
        return result;
      } catch (e) {
        (onError as (...a: unknown[]) => void)?.(e as Error);
        throw e;
      }
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(),
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

import useCreateTitle from '../useCreateTitle';
import useUpdateTitle from '../useUpdateTitle';
import useDeleteTitle from '../useDeleteTitle';

const WORK_ID = 'work-1';
const TITLE_ID = 'title-1';
const mockData = { name: 'Book Title' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.titleService.createTitle.mockResolvedValue({ id: TITLE_ID });
  mockServices.titleService.updateTitle.mockResolvedValue(undefined);
  mockServices.titleService.deleteTitle.mockResolvedValue(undefined);
}

describe('useCreateTitle', () => {
  it('creates title via service with data and relatedWorkId', async () => {
    setup();
    const { createTitle } = useCreateTitle();
    await createTitle({ data: mockData, relatedWorkId: WORK_ID });
    expect(mockServices.titleService.createTitle).toHaveBeenCalledWith(mockData, WORK_ID);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.titleService.createTitle.mockRejectedValue(new Error('fail'));
    const { createTitle } = useCreateTitle();
    await expect(createTitle({ data: mockData, relatedWorkId: WORK_ID })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateTitle', () => {
  it('updates title via service with no invalidation', async () => {
    setup();
    const { updateTitle } = useUpdateTitle();
    await updateTitle({ data: mockData, relatedWorkId: WORK_ID });
    expect(mockServices.titleService.updateTitle).toHaveBeenCalledWith(mockData, WORK_ID);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('useDeleteTitle', () => {
  it('deletes title via service and invalidates many query keys', async () => {
    setup();
    const { deleteTitle } = useDeleteTitle(WORK_ID);
    await deleteTitle(TITLE_ID);
    expect(mockServices.titleService.deleteTitle).toHaveBeenCalledWith(TITLE_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['set', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workTranslations', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['translatedWorks', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workEditions', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workPrevEditions', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['forthcomingBooksCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publishedBooksCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestUpdatedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestPublishedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['sets'] });
  });
});
