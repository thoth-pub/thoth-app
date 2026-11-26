import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.hoisted(() => vi.fn());
const publisherMock = vi.hoisted(() => vi.fn());

vi.mock('@/src/entities/book', () => ({ useBooksCountsByMonth: queryMock }));
vi.mock('@/src/entities/publisher', () => ({ usePublisherStateMachine: publisherMock }));

import { useBooksCountsByMonth } from '../useBooksCountsByMonth';

describe('useBooksCountsByMonth', () => {
  beforeEach(() => {
    queryMock.mockReset();
    publisherMock.mockReset();
    queryMock.mockReturnValue({ counts: [5, 4], isFetched: true });
    publisherMock.mockReturnValue({ activePublisher: { id: 'pub-1' } });
  });

  it('returns the counts and isFetched from one batched query for the active publisher', () => {
    const { result } = renderHook(() =>
      useBooksCountsByMonth({ dates: ['2024-02-01', '2024-01-01'], workStatuses: ['ACTIVE'] as never }),
    );

    expect(result.current.counts).toEqual([5, 4]);
    expect(result.current.isFetched).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith({
      publishersIds: ['pub-1'],
      dates: ['2024-02-01', '2024-01-01'],
      workStatuses: ['ACTIVE'],
    });
  });

  it('passes no publisher and defaults counts to an empty list when none is active', () => {
    publisherMock.mockReturnValue({ activePublisher: undefined });
    queryMock.mockReturnValue({ counts: undefined, isFetched: false });

    const { result } = renderHook(() => useBooksCountsByMonth({ dates: ['2024-01-01'], workStatuses: [] }));

    expect(result.current.counts).toEqual([]);
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ publishersIds: [] }));
  });
});
