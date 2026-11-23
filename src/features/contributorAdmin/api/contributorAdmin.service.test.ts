import { describe, expect, it, vi } from 'vitest';

import type { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';

import type { AdminCredit } from '../model/contributorAdmin.types';
import { ContributorAdminService } from './contributorAdmin.service';

const page = (count: number, start = 0) => ({
  contributor: {
    contributorId: 'dup',
    contributions: Array.from({ length: count }, (_, i) => ({
      contributionId: `c${start + i}`,
      contributorId: 'dup',
      workId: `w${start + i}`,
      contributionType: 'AUTHOR',
      mainContribution: false,
      firstName: null,
      lastName: 'L',
      fullName: 'F L',
      contributionOrdinal: 1,
      work: {
        titles: [{ canonical: true, title: 'T' }],
        imprint: { publisher: { publisherName: 'P' } },
      },
    })),
  },
});

describe('ContributorAdminService', () => {
  it('reads every credit page and stops on a short page', async () => {
    const size = appConfig.data.itemsPerRequestLimit;
    const query = vi.fn().mockResolvedValueOnce(page(size)).mockResolvedValueOnce(page(3, size));
    const service = new ContributorAdminService({ query } as unknown as GraphqlService);

    const credits = await service.getCredits('dup');

    expect(credits).toHaveLength(size + 3);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toMatchObject({ offset: size });
  });

  it('rejects the whole read when a page fails, so a partial list is never returned', async () => {
    const size = appConfig.data.itemsPerRequestLimit;
    const query = vi.fn().mockResolvedValueOnce(page(size)).mockRejectedValueOnce(new Error('timeout'));
    const service = new ContributorAdminService({ query } as unknown as GraphqlService);

    await expect(service.getCredits('dup')).rejects.toThrow('timeout');
  });

  it('repoints a credit changing only the contributor', async () => {
    const mutation = vi.fn().mockResolvedValue({});
    const service = new ContributorAdminService({ mutation } as unknown as GraphqlService);
    const credit: AdminCredit = {
      contributionId: 'c1',
      contributorId: 'dup',
      workId: 'w1',
      contributionType: 'EDITOR' as AdminCredit['contributionType'],
      mainContribution: true,
      firstName: 'A',
      lastName: 'B',
      fullName: 'A B',
      contributionOrdinal: 4,
      workTitle: 'T',
      publisherName: 'P',
    };

    await service.repointCredit(credit, 'keep');

    expect(mutation.mock.calls[0][1]).toEqual({
      data: {
        contributionId: 'c1',
        workId: 'w1',
        contributorId: 'keep',
        contributionType: 'EDITOR',
        mainContribution: true,
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        contributionOrdinal: 4,
      },
    });
  });
});
