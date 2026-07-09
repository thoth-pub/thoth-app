import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  seriesService: { getSeries: vi.fn(), getSerieses: vi.fn(), getSeriesCount: vi.fn(), getAllSerieses: vi.fn(), createSeries: vi.fn(), updateSeries: vi.fn(), deleteSeries: vi.fn(), createIssue: vi.fn(), updateIssue: vi.fn(), deleteIssue: vi.fn(), moveIssue: vi.fn() },
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

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { isSuperuser: false, linkedPublishers: [{ publisherId: 'pub-1', imprints: [] }] } })),
}));

import useSeries from '../useSeries';
import useSerieses from '../useSerieses';
import useSeriesesCount from '../useSeriesesCount';
import useAllUserSerieses from '../useAllUserSerieses';
import useCreateSeries from '../useCreateSeries';
import useUpdateSeries from '../useUpdateSeries';
import useDeleteSeries from '../useDeleteSeries';
import useCreateIssue from '../useCreateIssue';
import useUpdateIssue from '../useUpdateIssue';
import useDeleteIssue from '../useDeleteIssue';
import useMoveIssue from '../useMoveIssue';

const SERIES_ID = 'series-1';
const ISSUE_ID = 'issue-1';

function setup() {
  vi.clearAllMocks();
  mockServices.seriesService.getSeries.mockResolvedValue({ id: SERIES_ID });
  mockServices.seriesService.getSerieses.mockResolvedValue([]);
  mockServices.seriesService.getSeriesCount.mockResolvedValue(0);
  mockServices.seriesService.getAllSerieses.mockResolvedValue([]);
  mockServices.seriesService.createSeries.mockResolvedValue({ id: SERIES_ID });
  mockServices.seriesService.updateSeries.mockResolvedValue(undefined);
  mockServices.seriesService.deleteSeries.mockResolvedValue(undefined);
  mockServices.seriesService.createIssue.mockResolvedValue({ id: ISSUE_ID });
  mockServices.seriesService.updateIssue.mockResolvedValue(undefined);
  mockServices.seriesService.deleteIssue.mockResolvedValue(undefined);
  mockServices.seriesService.moveIssue.mockResolvedValue(undefined);
}

describe('useSeries', () => {
  it('queries series by id', () => {
    setup();
    const { series } = useSeries({ seriesId: SERIES_ID });
    expect(series).toBeUndefined();
  });
});

describe('useSerieses', () => {
  it('queries serieses with publishersIds', () => {
    setup();
    const { serieses } = useSerieses({ publishersIds: ['pub-1'] });
    expect(serieses).toEqual([]);
  });
});

describe('useSeriesesCount', () => {
  it('queries series count', () => {
    setup();
    const { seriesCount } = useSeriesesCount({ publishersIds: ['pub-1'] });
    expect(seriesCount).toBe(0);
  });
});

describe('useAllUserSerieses', () => {
  it('queries all user serieses', () => {
    setup();
    const { serieses } = useAllUserSerieses();
    expect(serieses).toEqual([]);
  });
});

describe('useCreateSeries', () => {
  it('creates series via service and invalidates', async () => {
    setup();
    const { createSeries } = useCreateSeries();
    await createSeries({ name: 'New Series' } as any);
    expect(mockServices.seriesService.createSeries).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
  });
});

describe('useUpdateSeries', () => {
  it('updates series via service and invalidates', async () => {
    setup();
    const { updateSeries } = useUpdateSeries();
    await updateSeries({ id: SERIES_ID } as any);
    expect(mockServices.seriesService.updateSeries).toHaveBeenCalledWith({ id: SERIES_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
  });
});

describe('useDeleteSeries', () => {
  it('deletes series via service and invalidates', async () => {
    setup();
    const { deleteSeries } = useDeleteSeries();
    await deleteSeries(SERIES_ID);
    expect(mockServices.seriesService.deleteSeries).toHaveBeenCalledWith(SERIES_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
  });
});

describe('useCreateIssue', () => {
  it('creates issue via service and invalidates', async () => {
    setup();
    const { createIssue } = useCreateIssue();
    await createIssue({ orderNumber: 1, seriesId: SERIES_ID, workId: 'work-1' });
    expect(mockServices.seriesService.createIssue).toHaveBeenCalledWith({ orderNumber: 1, seriesId: SERIES_ID, workId: 'work-1' });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });
});

describe('useUpdateIssue', () => {
  it('updates issue via service and invalidates', async () => {
    setup();
    const { updateIssue } = useUpdateIssue();
    await updateIssue({ issueId: ISSUE_ID, orderNumber: 1, seriesId: SERIES_ID, workId: 'work-1' });
    expect(mockServices.seriesService.updateIssue).toHaveBeenCalledWith({ issueId: ISSUE_ID, orderNumber: 1, seriesId: SERIES_ID, workId: 'work-1' });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });
});

describe('useDeleteIssue', () => {
  it('deletes issue via service and invalidates', async () => {
    setup();
    const { deleteIssue } = useDeleteIssue();
    await deleteIssue(ISSUE_ID);
    expect(mockServices.seriesService.deleteIssue).toHaveBeenCalledWith(ISSUE_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['seriesesCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });
});

describe('useMoveIssue', () => {
  it('moves issue via service and invalidates', async () => {
    setup();
    const { moveIssue } = useMoveIssue({ seriesId: SERIES_ID });
    await moveIssue({ issueId: ISSUE_ID, newOrdinal: 1 });
    expect(mockServices.seriesService.moveIssue).toHaveBeenCalledWith(ISSUE_ID, 1);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series', SERIES_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });
});
