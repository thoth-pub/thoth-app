import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  setService: { getSet: vi.fn(), getSets: vi.fn(), getSetsCount: vi.fn(), getBookSetWorks: vi.fn(), createSet: vi.fn(), updateSet: vi.fn(), deleteSet: vi.fn(), addBookToSet: vi.fn(), deleteBookFromSet: vi.fn(), moveBookInSet: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.(result);
        return result;
      } catch (e) {
        (onError as (...a: unknown[]) => void)?.(e as Error);
        throw e;
      }
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: undefined, error: null, isLoading: false, isFetched: true })),
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

import { useCreateSet } from '../useCreateSet';
import { useUpdateSet } from '../useUpdateSet';
import { useDeleteSet } from '../useDeleteSet';
import { useAddToSet } from '../useAddToSet';
import { useDeleteFromSet } from '../useDeleteFromSet';
import { useMoveSetRelation } from '../useMoveSetRelation';
import useSet from '../useSet';
import useSets from '../useSets';
import useSetsCount from '../useSetsCount';
import { useBookSetWorks } from '../useBookSetWorks';

const SET_ID = 'set-1';
const mockData = { name: 'Collection' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.setService.getSet.mockResolvedValue({ id: SET_ID });
  mockServices.setService.getSets.mockResolvedValue([]);
  mockServices.setService.getSetsCount.mockResolvedValue(0);
  mockServices.setService.getBookSetWorks.mockResolvedValue([]);
  mockServices.setService.createSet.mockResolvedValue({ id: SET_ID });
  mockServices.setService.updateSet.mockResolvedValue({ id: SET_ID });
  mockServices.setService.deleteSet.mockResolvedValue(undefined);
  mockServices.setService.addBookToSet.mockResolvedValue(undefined);
  mockServices.setService.deleteBookFromSet.mockResolvedValue(undefined);
  mockServices.setService.moveBookInSet.mockResolvedValue(undefined);
}

describe('useSet', () => {
  it('queries set by id', () => {
    setup();
    const { set: mySet } = useSet(SET_ID);
    expect(mySet).toBeDefined();
  });
});

describe('useSets', () => {
  it('queries sets with publishersIds', () => {
    setup();
    const { sets } = useSets({ publishersIds: ['pub-1'] });
    expect(sets).toEqual([]);
  });
});

describe('useSetsCount', () => {
  it('queries sets count', () => {
    setup();
    const { setsCount } = useSetsCount({ publishersIds: ['pub-1'] });
    expect(setsCount).toBe(0);
  });
});

describe('useBookSetWorks', () => {
  it('queries book set works by setId', () => {
    setup();
    const { bookSetWorks } = useBookSetWorks(SET_ID);
    expect(bookSetWorks).toEqual([]);
  });
});

describe('useCreateSet', () => {
  it('creates set via service and invalidates', async () => {
    setup();
    const { createSet } = useCreateSet();
    await createSet({ data: mockData });
    expect(mockServices.setService.createSet).toHaveBeenCalledWith(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['sets'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['setsCount'] });
  });
});

describe('useUpdateSet', () => {
  it('updates set via service and invalidates', async () => {
    setup();
    const { updateSet } = useUpdateSet();
    await updateSet({ id: SET_ID } as any);
    expect(mockServices.setService.updateSet).toHaveBeenCalledWith({ id: SET_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['sets'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['set', SET_ID] });
  });
});

describe('useDeleteSet', () => {
  it('deletes set via service and invalidates', async () => {
    setup();
    const { deleteSet } = useDeleteSet();
    await deleteSet(SET_ID);
    expect(mockServices.setService.deleteSet).toHaveBeenCalledWith(SET_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['sets'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['setsCount'] });
  });
});

describe('useAddToSet', () => {
  it('adds book to set via service', async () => {
    setup();
    const { addToSet } = useAddToSet(SET_ID);
    await addToSet({ setId: SET_ID, bookId: 'work-1', ordinal: 1 });
    expect(mockServices.setService.addBookToSet).toHaveBeenCalledWith(SET_ID, 'work-1', 1);
  });

  it('invalidates set, bookSetWorks and workSet on success', async () => {
    setup();
    const { addToSet } = useAddToSet(SET_ID);
    await addToSet({ setId: SET_ID, bookId: 'work-1', ordinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['set', SET_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['bookSetWorks', SET_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workSet'] });
  });
});

describe('useDeleteFromSet', () => {
  it('deletes from set via service', async () => {
    setup();
    const { deleteFromSet } = useDeleteFromSet(SET_ID);
    await deleteFromSet('relation-1');
    expect(mockServices.setService.deleteBookFromSet).toHaveBeenCalledWith('relation-1');
  });

  it('invalidates set and bookSetWorks', async () => {
    setup();
    const { deleteFromSet } = useDeleteFromSet(SET_ID);
    await deleteFromSet('relation-1');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['set', SET_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['bookSetWorks', SET_ID] });
  });
});

describe('useMoveSetRelation', () => {
  it('moves set relation via service', async () => {
    setup();
    const { moveSetRelation } = useMoveSetRelation(SET_ID);
    await moveSetRelation({ relationId: 'rel-1', newOrdinal: 1 });
    expect(mockServices.setService.moveBookInSet).toHaveBeenCalledWith('rel-1', 1);
  });

  it('invalidates bookSetWorks', async () => {
    setup();
    const { moveSetRelation } = useMoveSetRelation(SET_ID);
    await moveSetRelation({ relationId: 'rel-1', newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['bookSetWorks', SET_ID] });
  });
});
