import { describe, expect, it, vi } from 'vitest';

import type { ContributorAdminApi } from '../api/contributorAdmin.service';
import type { AdminCredit } from './contributorAdmin.types';
import { mergeContributorInto } from './mergeContributor';

const credit = (id: string, workId: string, contributorId = 'dup'): AdminCredit => ({
  contributionId: id,
  contributorId,
  workId,
  contributionType: 'AUTHOR' as AdminCredit['contributionType'],
  mainContribution: true,
  firstName: 'A',
  lastName: 'B',
  fullName: 'A B',
  contributionOrdinal: 1,
  workTitle: `Work ${workId}`,
  publisherName: 'Pub',
});

// A tiny in-memory Thoth: credits keyed by contributor, so re-reads reflect earlier writes.
const makeApi = (store: Record<string, AdminCredit[]> = {}) => {
  const api = {
    listContributors: vi.fn(),
    countContributors: vi.fn(),
    getCredits: vi.fn(async (id: string) => [...(store[id] ?? [])]),
    repointCredit: vi.fn(async (c: AdminCredit, targetId: string) => {
      store[c.contributorId] = (store[c.contributorId] ?? []).filter((x) => x.contributionId !== c.contributionId);
      store[targetId] = [...(store[targetId] ?? []), { ...c, contributorId: targetId }];
    }),
    deleteContributor: vi.fn(async () => undefined),
  };
  const typed: ContributorAdminApi = api;
  void typed;

  return { api, store };
};

describe('mergeContributorInto', () => {
  it('moves every credit, then deletes the empty duplicate', async () => {
    const { api, store } = makeApi({ dup: [credit('c1', 'w1'), credit('c2', 'w2')], keep: [] });

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome.state).toBe('deleted');
    expect(api.repointCredit).toHaveBeenCalledTimes(2);
    expect(store.dup).toEqual([]);
    expect(store.keep).toHaveLength(2);
    expect(api.deleteContributor).toHaveBeenCalledWith('dup');
  });

  it('sends the credit unchanged except for the contributor', async () => {
    const original = credit('c1', 'w1');
    const { api } = makeApi({ dup: [original], keep: [] });

    await mergeContributorInto(api, 'dup', 'keep');

    expect(api.repointCredit).toHaveBeenCalledWith(original, 'keep');
  });

  it('skips a work that already credits the survivor and does not delete', async () => {
    const { api } = makeApi({ dup: [credit('c1', 'w1'), credit('c2', 'w2')], keep: [credit('k1', 'w1', 'keep')] });

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome).toMatchObject({ state: 'incomplete', reason: 'credits-remain' });
    expect(outcome.results.map((r) => r.status)).toEqual(['skipped', 'moved']);
    expect(api.repointCredit).toHaveBeenCalledTimes(1);
    expect(api.deleteContributor).not.toHaveBeenCalled();
  });

  it('stops at the first failed credit and never deletes', async () => {
    const { api } = makeApi({ dup: [credit('c1', 'w1'), credit('c2', 'w2'), credit('c3', 'w3')], keep: [] });
    api.repointCredit.mockRejectedValueOnce(new Error('NO_ACCESS'));

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome).toMatchObject({ state: 'incomplete', reason: 'credit-failed', error: 'NO_ACCESS' });
    expect(api.repointCredit).toHaveBeenCalledTimes(1);
    expect(api.deleteContributor).not.toHaveBeenCalled();
  });

  it('resumes: running again on the same pair moves what is left and then deletes', async () => {
    const { api } = makeApi({ dup: [credit('c1', 'w1'), credit('c2', 'w2')], keep: [] });
    api.repointCredit.mockImplementationOnce(async () => {
      throw new Error('boom');
    });

    const first = await mergeContributorInto(api, 'dup', 'keep');
    expect(first).toMatchObject({ reason: 'credit-failed' });

    const second = await mergeContributorInto(api, 'dup', 'keep');
    expect(second.state).toBe('deleted');
    expect(api.deleteContributor).toHaveBeenCalledTimes(1);
  });

  it('never deletes when the final read of the duplicate fails', async () => {
    const { api } = makeApi({ dup: [credit('c1', 'w1')], keep: [] });
    const read = api.getCredits.getMockImplementation()!;
    // preview reads (source, target) succeed; the post-move re-read of the source fails
    api.getCredits
      .mockImplementationOnce(read)
      .mockImplementationOnce(read)
      .mockRejectedValueOnce(new Error('timeout'));

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome).toMatchObject({ state: 'incomplete', reason: 'read-failed' });
    expect(api.deleteContributor).not.toHaveBeenCalled();
  });

  it('writes nothing when the preview read fails', async () => {
    const { api } = makeApi();
    api.getCredits.mockRejectedValue(new Error('down'));

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome).toMatchObject({ state: 'incomplete', reason: 'read-failed' });
    expect(api.repointCredit).not.toHaveBeenCalled();
    expect(api.deleteContributor).not.toHaveBeenCalled();
  });

  it('reports a failed delete after all credits moved', async () => {
    const { api } = makeApi({ dup: [credit('c1', 'w1')], keep: [] });
    api.deleteContributor.mockRejectedValueOnce(new Error('denied'));

    const outcome = await mergeContributorInto(api, 'dup', 'keep');

    expect(outcome).toMatchObject({ state: 'incomplete', reason: 'delete-failed', error: 'denied' });
  });

  it('refuses to merge a contributor into itself or with an empty id', async () => {
    const { api } = makeApi();

    expect(await mergeContributorInto(api, 'same', 'same')).toMatchObject({ state: 'incomplete' });
    expect(await mergeContributorInto(api, '', 'keep')).toMatchObject({ state: 'incomplete' });
    expect(api.getCredits).not.toHaveBeenCalled();
    expect(api.deleteContributor).not.toHaveBeenCalled();
  });
});
