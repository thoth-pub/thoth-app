import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  subjectService: { createSubject: vi.fn(), updateSubject: vi.fn(), deleteSubject: vi.fn(), moveSubject: vi.fn() },
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

import useCreateSubject from '../useCreateSubject';
import useUpdateSubject from '../useUpdateSubject';
import useDeleteSubject from '../useDeleteSubject';
import useMoveSubjects from '../useMoveSubjects';

const WORK_ID = 'work-1';
const SUBJECT_ID = 'sub-1';
const mockData = { code: 'FIC' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.subjectService.createSubject.mockResolvedValue({ id: SUBJECT_ID });
  mockServices.subjectService.updateSubject.mockResolvedValue(undefined);
  mockServices.subjectService.deleteSubject.mockResolvedValue(undefined);
  mockServices.subjectService.moveSubject.mockResolvedValue(undefined);
}

describe('useCreateSubject', () => {
  it('creates subject via service with workId', async () => {
    setup();
    const { createSubject } = useCreateSubject({ workId: WORK_ID });
    await createSubject(mockData);
    expect(mockServices.subjectService.createSubject).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { createSubject } = useCreateSubject({ workId: WORK_ID });
    await createSubject(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.subjectService.createSubject.mockRejectedValue(new Error('fail'));
    const { createSubject } = useCreateSubject({ workId: WORK_ID });
    await expect(createSubject(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateSubject', () => {
  it('updates subject via service', async () => {
    setup();
    const { updateSubject } = useUpdateSubject({ workId: WORK_ID });
    await updateSubject(mockData);
    expect(mockServices.subjectService.updateSubject).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { updateSubject } = useUpdateSubject({ workId: WORK_ID });
    await updateSubject(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useDeleteSubject', () => {
  it('deletes subject via service', async () => {
    setup();
    const { deleteSubject } = useDeleteSubject();
    await deleteSubject(SUBJECT_ID);
    expect(mockServices.subjectService.deleteSubject).toHaveBeenCalledWith(SUBJECT_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { deleteSubject } = useDeleteSubject();
    await deleteSubject(SUBJECT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useMoveSubjects', () => {
  it('moves subject via service', async () => {
    setup();
    const { moveSubjects } = useMoveSubjects({ workId: WORK_ID });
    await moveSubjects({ subjectId: SUBJECT_ID, newOrdinal: 1 });
    expect(mockServices.subjectService.moveSubject).toHaveBeenCalledWith(SUBJECT_ID, 1);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { moveSubjects } = useMoveSubjects({ workId: WORK_ID });
    await moveSubjects({ subjectId: SUBJECT_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});
