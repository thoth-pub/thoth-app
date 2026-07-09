import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  bookReviewService: { createBookReview: vi.fn(), updateBookReview: vi.fn(), deleteBookReview: vi.fn(), moveBookReview: vi.fn() },
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

import useCreateBookReview from '../useCreateBookReview';
import useUpdateBookReview from '../useUpdateBookReview';
import useDeleteBookReview from '../useDeleteBookReview';
import useMoveBookReview from '../useMoveBookReview';

const WORK_ID = 'work-1';
const REVIEW_ID = 'review-1';
const mockData = { text: 'Great read' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.bookReviewService.createBookReview.mockResolvedValue({ id: REVIEW_ID });
  mockServices.bookReviewService.updateBookReview.mockResolvedValue(undefined);
  mockServices.bookReviewService.deleteBookReview.mockResolvedValue(undefined);
  mockServices.bookReviewService.moveBookReview.mockResolvedValue(undefined);
}

describe('useCreateBookReview', () => {
  it('creates book review via service with workId', async () => {
    setup();
    const { createBookReview } = useCreateBookReview({ workId: WORK_ID });
    await createBookReview(mockData);
    expect(mockServices.bookReviewService.createBookReview).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createBookReview } = useCreateBookReview({ workId: WORK_ID });
    await createBookReview(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.bookReviewService.createBookReview.mockRejectedValue(new Error('fail'));
    const { createBookReview } = useCreateBookReview({ workId: WORK_ID });
    await expect(createBookReview(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateBookReview', () => {
  it('updates book review via service', async () => {
    setup();
    const { updateBookReview } = useUpdateBookReview({ workId: WORK_ID });
    await updateBookReview(mockData);
    expect(mockServices.bookReviewService.updateBookReview).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateBookReview } = useUpdateBookReview({ workId: WORK_ID });
    await updateBookReview(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.bookReviewService.updateBookReview.mockRejectedValue(new Error('fail'));
    const { updateBookReview } = useUpdateBookReview({ workId: WORK_ID });
    await expect(updateBookReview(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeleteBookReview', () => {
  it('deletes book review via service', async () => {
    setup();
    const { deleteBookReview } = useDeleteBookReview({ workId: WORK_ID });
    await deleteBookReview(REVIEW_ID);
    expect(mockServices.bookReviewService.deleteBookReview).toHaveBeenCalledWith(REVIEW_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteBookReview } = useDeleteBookReview({ workId: WORK_ID });
    await deleteBookReview(REVIEW_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useMoveBookReview', () => {
  it('moves book review via service', async () => {
    setup();
    const { moveBookReview } = useMoveBookReview({ workId: WORK_ID });
    await moveBookReview({ bookReviewId: REVIEW_ID, newOrdinal: 1 });
    expect(mockServices.bookReviewService.moveBookReview).toHaveBeenCalledWith(REVIEW_ID, 1);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { moveBookReview } = useMoveBookReview({ workId: WORK_ID });
    await moveBookReview({ bookReviewId: REVIEW_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
