import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockProgress = { progress: 0, setProgress: vi.fn(), startProgress: vi.fn(), resetProgress: vi.fn() };
const mockServices = {
  additionalResourceService: { createAdditionalResource: vi.fn(), updateAdditionalResource: vi.fn(), deleteAdditionalResource: vi.fn(), moveAdditionalResource: vi.fn(), uploadFile: vi.fn() },
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

import useCreateAdditionalResource from '../useCreateAdditionalResource';
import useUpdateAdditionalResource from '../useUpdateAdditionalResource';
import useDeleteAdditionalResource from '../useDeleteAdditionalResource';
import useMoveAdditionalResource from '../useMoveAdditionalResource';
import useUploadAdditionalResourceFile from '../useUploadAdditionalResourceFile';

const WORK_ID = 'work-1';
const RESOURCE_ID = 'res-1';
const mockData = { name: 'Worksheet' } as any;
const mockFile = new File([''], 'file.pdf');

function setup() {
  vi.clearAllMocks();
  mockServices.additionalResourceService.createAdditionalResource.mockResolvedValue({ id: RESOURCE_ID });
  mockServices.additionalResourceService.updateAdditionalResource.mockResolvedValue(undefined);
  mockServices.additionalResourceService.deleteAdditionalResource.mockResolvedValue(undefined);
  mockServices.additionalResourceService.moveAdditionalResource.mockResolvedValue(undefined);
  mockServices.additionalResourceService.uploadFile.mockResolvedValue('https://example.com/file.pdf');
}

describe('useCreateAdditionalResource', () => {
  it('creates additional resource via service', async () => {
    setup();
    const { createAdditionalResource } = useCreateAdditionalResource({ workId: WORK_ID });
    await createAdditionalResource({ data: mockData, file: mockFile });
    expect(mockServices.additionalResourceService.createAdditionalResource).toHaveBeenCalledWith(mockData, WORK_ID, mockFile, mockProgress.setProgress);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createAdditionalResource } = useCreateAdditionalResource({ workId: WORK_ID });
    await createAdditionalResource({ data: mockData, file: mockFile });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.additionalResourceService.createAdditionalResource.mockRejectedValue(new Error('fail'));
    const { createAdditionalResource } = useCreateAdditionalResource({ workId: WORK_ID });
    await expect(createAdditionalResource({ data: mockData, file: mockFile })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateAdditionalResource', () => {
  it('updates additional resource via service', async () => {
    setup();
    const { updateAdditionalResource } = useUpdateAdditionalResource({ workId: WORK_ID });
    await updateAdditionalResource(mockData);
    expect(mockServices.additionalResourceService.updateAdditionalResource).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateAdditionalResource } = useUpdateAdditionalResource({ workId: WORK_ID });
    await updateAdditionalResource(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useDeleteAdditionalResource', () => {
  it('deletes additional resource via service', async () => {
    setup();
    const { deleteAdditionalResource } = useDeleteAdditionalResource({ workId: WORK_ID });
    await deleteAdditionalResource(RESOURCE_ID);
    expect(mockServices.additionalResourceService.deleteAdditionalResource).toHaveBeenCalledWith(RESOURCE_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteAdditionalResource } = useDeleteAdditionalResource({ workId: WORK_ID });
    await deleteAdditionalResource(RESOURCE_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useMoveAdditionalResource', () => {
  it('moves additional resource via service', async () => {
    setup();
    const { moveAdditionalResource } = useMoveAdditionalResource({ workId: WORK_ID });
    await moveAdditionalResource({ additionalResourceId: RESOURCE_ID, newOrdinal: 1 });
    expect(mockServices.additionalResourceService.moveAdditionalResource).toHaveBeenCalledWith(RESOURCE_ID, 1);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { moveAdditionalResource } = useMoveAdditionalResource({ workId: WORK_ID });
    await moveAdditionalResource({ additionalResourceId: RESOURCE_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useUploadAdditionalResourceFile', () => {
  it('uploads file via service and invalidates work', async () => {
    setup();
    const { uploadAdditionalResourceFile } = useUploadAdditionalResourceFile(WORK_ID);
    const url = await uploadAdditionalResourceFile(RESOURCE_ID, mockFile);
    expect(mockServices.additionalResourceService.uploadFile).toHaveBeenCalledWith(RESOURCE_ID, mockFile, mockProgress.setProgress);
    expect(url).toBe('https://example.com/file.pdf');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.additionalResourceService.uploadFile.mockRejectedValue(new Error('fail'));
    const { uploadAdditionalResourceFile } = useUploadAdditionalResourceFile(WORK_ID);
    await expect(uploadAdditionalResourceFile(RESOURCE_ID, mockFile)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});
