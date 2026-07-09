import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  languageService: { createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn() },
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

import useCreateLanguage from '../useCreateLanguage';
import useUpdateLanguage from '../useUpdateLanguage';
import useDeleteLanguage from '../useDeleteLanguage';
import useLanguage from '../useLanguage';

const WORK_ID = 'work-1';
const LANG_ID = 'lang-1';
const mockData = { code: 'eng' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.languageService.createLanguage.mockResolvedValue({ id: LANG_ID });
  mockServices.languageService.updateLanguage.mockResolvedValue(undefined);
  mockServices.languageService.deleteLanguage.mockResolvedValue(undefined);
}

describe('useCreateLanguage', () => {
  it('creates language via service with workId', async () => {
    setup();
    const { createLanguage } = useCreateLanguage({ workId: WORK_ID });
    await createLanguage(mockData);
    expect(mockServices.languageService.createLanguage).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { createLanguage } = useCreateLanguage({ workId: WORK_ID });
    await createLanguage(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.languageService.createLanguage.mockRejectedValue(new Error('fail'));
    const { createLanguage } = useCreateLanguage({ workId: WORK_ID });
    await expect(createLanguage(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateLanguage', () => {
  it('updates language via service', async () => {
    setup();
    const { updateLanguage } = useUpdateLanguage({ workId: WORK_ID });
    await updateLanguage(mockData);
    expect(mockServices.languageService.updateLanguage).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { updateLanguage } = useUpdateLanguage({ workId: WORK_ID });
    await updateLanguage(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useDeleteLanguage', () => {
  it('deletes language via service', async () => {
    setup();
    const { deleteLanguage } = useDeleteLanguage();
    await deleteLanguage(LANG_ID);
    expect(mockServices.languageService.deleteLanguage).toHaveBeenCalledWith(LANG_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { deleteLanguage } = useDeleteLanguage();
    await deleteLanguage(LANG_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useLanguage (composition)', () => {
  it('combines create/update/delete hooks', () => {
    setup();
    const lang = useLanguage({ workId: WORK_ID });
    expect(lang).toHaveProperty('createLanguage');
    expect(lang).toHaveProperty('updateLanguage');
    expect(lang).toHaveProperty('deleteLanguage');
  });
});