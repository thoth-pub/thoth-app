import { describe, expect, it, vi } from 'vitest';

import type { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { InstitutionService } from '@/src/entities/institution';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';

import { ImportLookupCoordinator } from './importLookupCoordinator';

const contributor = (fullName: string): ContributorEntity => ({
  id: `contributor-${fullName}`,
  name: fullName,
  fullName,
  firstName: '',
  lastName: '',
  orcid: '',
  website: '',
  updatedAt: '',
  lastContributionTitle: '',
});

const institution = (ror: string, id = ror): InstitutionEntity => ({
  id,
  name: id,
  doi: '',
  ror,
  countryCode: '',
  updatedAt: '',
});

describe('ImportLookupCoordinator', () => {
  it('coalesces duplicate promises and shares one bounded queue across both services', async () => {
    let active = 0;
    let maximumActive = 0;
    const releases = new Map<string, () => void>();
    const started: string[] = [];

    const controlled = <T>(key: string, result: T) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      started.push(key);

      return new Promise<T>((resolve) => {
        releases.set(key, () => {
          active -= 1;
          resolve(result);
        });
      });
    };

    const getContributors = vi.fn((filter: string) => controlled(`contributor:${filter}`, [contributor(filter)]));
    const getInstitutions = vi.fn((_offset: number, _limit: number, filter: string) =>
      controlled(`institution:${filter}`, [institution(filter)]),
    );
    const coordinator = new ImportLookupCoordinator(
      { getContributors } as unknown as ContributorService,
      { getInstitutions } as unknown as InstitutionService,
    );

    const contributorA = coordinator.findContributors('A');
    const duplicateContributorA = coordinator.findContributors('A');
    const contributorB = coordinator.findContributors('B');
    const institutionX = coordinator.findInstitutionByRor('https://ror.org/x');
    const duplicateInstitutionX = coordinator.findInstitutionByRor('https://ror.org/x');
    const institutionY = coordinator.findInstitutionByRor('https://ror.org/y');
    const contributorC = coordinator.findContributors('C');

    expect(duplicateContributorA).toBe(contributorA);
    expect(duplicateInstitutionX).toBe(institutionX);

    await Promise.resolve();

    expect(started).toEqual([
      'contributor:A',
      'contributor:B',
      'institution:https://ror.org/x',
      'institution:https://ror.org/y',
    ]);
    expect(active).toBe(4);
    expect(maximumActive).toBe(4);
    expect(getContributors).toHaveBeenCalledTimes(2);
    expect(getInstitutions).toHaveBeenCalledTimes(2);

    releases.get('contributor:A')?.();
    await contributorA;
    await duplicateContributorA;
    await Promise.resolve();

    expect(started.at(-1)).toBe('contributor:C');
    expect(active).toBe(4);
    expect(maximumActive).toBe(4);

    releases.get('contributor:B')?.();
    releases.get('institution:https://ror.org/x')?.();
    releases.get('institution:https://ror.org/y')?.();
    releases.get('contributor:C')?.();

    await expect(contributorB).resolves.toEqual([contributor('B')]);
    await expect(institutionX).resolves.toEqual(institution('https://ror.org/x'));
    await expect(duplicateInstitutionX).resolves.toEqual(institution('https://ror.org/x'));
    await expect(institutionY).resolves.toEqual(institution('https://ror.org/y'));
    await expect(contributorC).resolves.toEqual([contributor('C')]);
    expect(getContributors).toHaveBeenCalledTimes(3);
    expect(getInstitutions).toHaveBeenCalledTimes(2);
    expect(maximumActive).toBe(4);
  });

  it('propagates a genuine contributor lookup rejection to every coalesced caller', async () => {
    const failure = new Error('contributor lookup transport failure');
    const getContributors = vi.fn().mockRejectedValue(failure);
    const coordinator = new ImportLookupCoordinator(
      { getContributors } as unknown as ContributorService,
      { getInstitutions: vi.fn() } as unknown as InstitutionService,
    );

    const first = coordinator.findContributors('Jane Doe');
    const second = coordinator.findContributors('Jane Doe');

    // Coalescing must not soften the failure: both callers see the original rejection, and the
    // failed lookup is not retried behind their backs.
    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    expect(getContributors).toHaveBeenCalledTimes(1);
  });

  it('skips blank RORs, trims meaningful filters, and selects only an exact returned ROR', async () => {
    const exactRor = 'https://ror.org/exact';
    const exact = institution(exactRor, 'exact');
    const unrelated = institution('https://ror.org/unrelated', 'unrelated');
    const getInstitutions = vi.fn().mockResolvedValue([unrelated, exact]);
    const coordinator = new ImportLookupCoordinator(
      { getContributors: vi.fn() } as unknown as ContributorService,
      { getInstitutions } as unknown as InstitutionService,
    );

    await expect(coordinator.findInstitutionByRor(undefined)).resolves.toBeNull();
    await expect(coordinator.findInstitutionByRor(null)).resolves.toBeNull();
    await expect(coordinator.findInstitutionByRor('')).resolves.toBeNull();
    await expect(coordinator.findInstitutionByRor('   ')).resolves.toBeNull();
    await expect(coordinator.findInstitutionByRor(`  ${exactRor}  `)).resolves.toEqual(exact);

    expect(getInstitutions).toHaveBeenCalledTimes(1);
    expect(getInstitutions).toHaveBeenCalledWith(0, expect.any(Number), exactRor);
  });

  it('returns no institution when a broad search has no exact ROR candidate', async () => {
    const getInstitutions = vi.fn().mockResolvedValue([institution('https://ror.org/unrelated')]);
    const coordinator = new ImportLookupCoordinator(
      { getContributors: vi.fn() } as unknown as ContributorService,
      { getInstitutions } as unknown as InstitutionService,
    );

    await expect(coordinator.findInstitutionByRor('https://ror.org/requested')).resolves.toBeNull();
  });
});
