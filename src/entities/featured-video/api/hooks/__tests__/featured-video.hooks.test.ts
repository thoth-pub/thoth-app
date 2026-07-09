import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockProgress = { progress: 0, setProgress: vi.fn(), startProgress: vi.fn(), resetProgress: vi.fn() };
const mockServices = {
  featuredVideoService: { createFeaturedVideo: vi.fn(), updateFeaturedVideo: vi.fn(), deleteFeaturedVideo: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError, onSettled }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.();
        (onSettled as (...a: unknown[]) => void)?.();
        return result;
      } catch (e) {
        (onError as (...a: unknown[]) => void)?.(e as Error);
        (onSettled as (...a: unknown[]) => void)?.();
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
  useProgress: vi.fn(() => mockProgress),
  usePreventNavigation: vi.fn(),
  usePreventInteraction: vi.fn(),
}));

import useCreateFeaturedVideo from '../useCreateFeaturedVideo';
import useUpdateFeaturedVideo from '../useUpdateFeaturedVideo';
import useDeleteFeaturedVideo from '../useDeleteFeaturedVideo';

const WORK_ID = 'work-1';
const VIDEO_ID = 'video-1';
const mockData = { title: 'Trailer' } as any;
const mockFile = new File([''], 'video.mp4');

function setup() {
  vi.clearAllMocks();
  mockServices.featuredVideoService.createFeaturedVideo.mockResolvedValue({ id: VIDEO_ID });
  mockServices.featuredVideoService.updateFeaturedVideo.mockResolvedValue(undefined);
  mockServices.featuredVideoService.deleteFeaturedVideo.mockResolvedValue(undefined);
}

describe('useCreateFeaturedVideo', () => {
  it('creates featured video via service with file', async () => {
    setup();
    const { createFeaturedVideo } = useCreateFeaturedVideo({ workId: WORK_ID });
    await createFeaturedVideo({ data: mockData, file: mockFile });
    expect(mockServices.featuredVideoService.createFeaturedVideo).toHaveBeenCalledWith(mockData, WORK_ID, mockFile, mockProgress.setProgress);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createFeaturedVideo } = useCreateFeaturedVideo({ workId: WORK_ID });
    await createFeaturedVideo({ data: mockData, file: mockFile });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.featuredVideoService.createFeaturedVideo.mockRejectedValue(new Error('fail'));
    const { createFeaturedVideo } = useCreateFeaturedVideo({ workId: WORK_ID });
    await expect(createFeaturedVideo({ data: mockData, file: mockFile })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateFeaturedVideo', () => {
  it('updates featured video via service', async () => {
    setup();
    const { updateFeaturedVideo } = useUpdateFeaturedVideo({ workId: WORK_ID });
    await updateFeaturedVideo(mockData);
    expect(mockServices.featuredVideoService.updateFeaturedVideo).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateFeaturedVideo } = useUpdateFeaturedVideo({ workId: WORK_ID });
    await updateFeaturedVideo(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useDeleteFeaturedVideo', () => {
  it('deletes featured video via service and invalidates in finally', async () => {
    setup();
    const { deleteFeaturedVideo } = useDeleteFeaturedVideo({ workId: WORK_ID });
    await deleteFeaturedVideo(VIDEO_ID);
    expect(mockServices.featuredVideoService.deleteFeaturedVideo).toHaveBeenCalledWith(VIDEO_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('invalidates even on failure', async () => {
    setup();
    mockServices.featuredVideoService.deleteFeaturedVideo.mockRejectedValue(new Error('fail'));
    const { deleteFeaturedVideo } = useDeleteFeaturedVideo({ workId: WORK_ID });
    await deleteFeaturedVideo(VIDEO_ID);
    expect(mockSendError).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
