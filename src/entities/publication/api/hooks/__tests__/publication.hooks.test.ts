import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockProgress = { progress: 0, setProgress: vi.fn(), startProgress: vi.fn(), resetProgress: vi.fn() };
const mockServices = {
  publicationService: { createPublication: vi.fn(), updatePublication: vi.fn(), deletePublication: vi.fn(), uploadPublicationFile: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError, onSettled }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.(result);
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

import useCreatePublication from '../useCreatePublication';
import useUpdatePublication from '../useUpdatePublication';
import useDeletePublication from '../useDeletePublication';
import useUploadPublicationFile from '../useUploadPublicationFile';

const WORK_ID = 'work-1';
const PUBLICATION_ID = 'pub-1';
const mockData = { isbn: '123' } as any;
const mockFile = new File([''], 'book.pdf');
const mockOnCompleted = vi.fn();

function setup() {
  vi.clearAllMocks();
  mockServices.publicationService.createPublication.mockResolvedValue({ id: PUBLICATION_ID });
  mockServices.publicationService.updatePublication.mockResolvedValue(undefined);
  mockServices.publicationService.deletePublication.mockResolvedValue(undefined);
  mockServices.publicationService.uploadPublicationFile.mockResolvedValue('https://example.com/book.pdf');
}

describe('useCreatePublication', () => {
  it('creates publication via service with file', async () => {
    setup();
    const { createPublication } = useCreatePublication({ workId: WORK_ID });
    await createPublication({ data: mockData, file: mockFile });
    expect(mockServices.publicationService.createPublication).toHaveBeenCalledWith(mockData, WORK_ID, mockFile, mockProgress.setProgress);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createPublication } = useCreatePublication({ workId: WORK_ID });
    await createPublication({ data: mockData, file: mockFile });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('calls onCompleted on success', async () => {
    setup();
    const { createPublication } = useCreatePublication({ workId: WORK_ID, onCompleted: mockOnCompleted });
    await createPublication({ data: mockData, file: mockFile });
    expect(mockOnCompleted).toHaveBeenCalledWith({ id: PUBLICATION_ID });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.publicationService.createPublication.mockRejectedValue(new Error('fail'));
    const { createPublication } = useCreatePublication({ workId: WORK_ID });
    await expect(createPublication({ data: mockData, file: mockFile })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdatePublication', () => {
  it('updates publication via service', async () => {
    setup();
    const { updatePublication } = useUpdatePublication({ workId: WORK_ID });
    await updatePublication(mockData);
    expect(mockServices.publicationService.updatePublication).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updatePublication } = useUpdatePublication({ workId: WORK_ID });
    await updatePublication(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useDeletePublication', () => {
  it('deletes publication via service', async () => {
    setup();
    const { deletePublication } = useDeletePublication({ workId: WORK_ID });
    await deletePublication(PUBLICATION_ID);
    expect(mockServices.publicationService.deletePublication).toHaveBeenCalledWith(PUBLICATION_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deletePublication } = useDeletePublication({ workId: WORK_ID });
    await deletePublication(PUBLICATION_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useUploadPublicationFile', () => {
  it('uploads file via service and invalidates work', async () => {
    setup();
    const { uploadPublicationFile } = useUploadPublicationFile(WORK_ID);
    const url = await uploadPublicationFile(PUBLICATION_ID, mockFile);
    expect(mockServices.publicationService.uploadPublicationFile).toHaveBeenCalledWith(PUBLICATION_ID, mockFile, mockProgress.setProgress);
    expect(url).toBe('https://example.com/book.pdf');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.publicationService.uploadPublicationFile.mockRejectedValue(new Error('fail'));
    const { uploadPublicationFile } = useUploadPublicationFile(WORK_ID);
    await expect(uploadPublicationFile(PUBLICATION_ID, mockFile)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});
