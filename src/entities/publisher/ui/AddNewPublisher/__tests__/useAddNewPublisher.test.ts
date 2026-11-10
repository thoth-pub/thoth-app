/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAddNewPublisher } from '../useAddNewPublisher';

const linkedPublisher = (publisherId: string, publisherName: string) => ({
  publisherId,
  publisherName,
  publisherAdmin: true,
  workLifecycle: false,
  cdnWrite: false,
  imprints: [],
});

const mocks = vi.hoisted(() => ({
  identitySettled: true,
  refetch: vi.fn(),
  createPublisher: vi.fn(),
  createImprint: vi.fn(),
  setLinkedPublishers: vi.fn(),
  changeActivePublisher: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));

vi.mock('@/src/entities/imprint', () => ({
  useCreateImprint: () => ({ createImprint: mocks.createImprint, loading: false }),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ refetch: mocks.refetch, loading: false, identitySettled: mocks.identitySettled }),
}));

vi.mock('../../../api/hooks/useCreatePublisher', () => ({
  default: () => ({ createPublisher: mocks.createPublisher, loading: false }),
}));

vi.mock('../../../store/hooks/usePublisherStateMachine', () => ({
  default: () => ({
    changeActivePublisher: mocks.changeActivePublisher,
    setLinkedPublishers: mocks.setLinkedPublishers,
  }),
}));

const createNewPublisher = async () => {
  const { result } = renderHook(() => useAddNewPublisher());

  await act(async () => {
    await result.current.createNewPublisher({ publisherName: 'New Press' });
  });

  return result;
};

describe('useAddNewPublisher identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identitySettled = true;
    mocks.createPublisher.mockResolvedValue('publisher-new');
    mocks.createImprint.mockResolvedValue({});
  });

  it('writes the refetched linked publishers and switches to the new one after a successful refetch', async () => {
    const user = {
      id: 'user-1',
      isSuperuser: false,
      linkedPublishers: [linkedPublisher('publisher-1', 'Old Press'), linkedPublisher('publisher-new', 'New Press')],
    };
    mocks.refetch.mockResolvedValue({ data: user, isSuccess: true });

    await createNewPublisher();

    expect(mocks.setLinkedPublishers).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 'publisher-1', name: 'Old Press' }),
        expect.objectContaining({ id: 'publisher-new', name: 'New Press' }),
      ],
      false,
    );
    expect(mocks.changeActivePublisher).toHaveBeenCalledWith(expect.objectContaining({ id: 'publisher-new' }));
    expect(mocks.push).toHaveBeenCalled();
  });

  it('never writes the linked publishers from a failed refetch, even one carrying an empty list', async () => {
    mocks.refetch.mockResolvedValue({
      data: { id: '', isSuperuser: false, linkedPublishers: [] },
      isSuccess: false,
      isError: true,
    });

    await createNewPublisher();

    expect(mocks.setLinkedPublishers).not.toHaveBeenCalled();
    expect(mocks.changeActivePublisher).not.toHaveBeenCalled();
  });

  it('never writes the linked publishers from an unsettled refetch', async () => {
    // A refetch whose query moved on (a token rotation) resolves with the new query's pending result.
    mocks.refetch.mockResolvedValue({ data: undefined, isSuccess: false, isPending: true });

    await createNewPublisher();

    expect(mocks.setLinkedPublishers).not.toHaveBeenCalled();
  });

  it('cannot be submitted while identity is loading or expired', async () => {
    mocks.identitySettled = false;

    await createNewPublisher();

    expect(mocks.createPublisher).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.setLinkedPublishers).not.toHaveBeenCalled();
  });
});
