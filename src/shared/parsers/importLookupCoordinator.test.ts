import { describe, expect, it, vi } from 'vitest';

import type { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { InstitutionService } from '@/src/entities/institution';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';

import { ImportLookupCoordinator } from './importLookupCoordinator';

const contributor = (fullName: string, orcid = ''): ContributorEntity => ({
  id: `contributor-${fullName}`,
  name: fullName,
  fullName,
  firstName: '',
  lastName: '',
  orcid,
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

  describe('prefetchContributorsByOrcids', () => {
    const canonicalOrcid = (index: number) =>
      `https://orcid.org/0000-0002-${Math.floor(index / 10_000)
        .toString()
        .padStart(4, '0')}-${(index % 10_000).toString().padStart(4, '0')}`;

    const makeCoordinator = ({
      getContributors = vi.fn(),
      getContributorsByOrcids = vi.fn().mockResolvedValue([]),
    }: {
      getContributors?: ReturnType<typeof vi.fn>;
      getContributorsByOrcids?: ReturnType<typeof vi.fn>;
    } = {}) => {
      const coordinator = new ImportLookupCoordinator(
        { getContributors, getContributorsByOrcids } as unknown as ContributorService,
        { getInstitutions: vi.fn() } as unknown as InstitutionService,
      );

      return {
        coordinator,
        prefetch: (orcids: Array<string | null | undefined>) =>
          (
            coordinator as ImportLookupCoordinator & {
              prefetchContributorsByOrcids: (values: Array<string | null | undefined>) => Promise<void>;
            }
          ).prefetchContributorsByOrcids(orcids),
      };
    };

    it('preserves the lazy exact-match fallback for a partial service without the batch method', async () => {
      const orcid = canonicalOrcid(1);
      const exact = contributor('Stored Name', orcid);
      const getContributors = vi.fn().mockResolvedValue([exact]);
      const coordinator = new ImportLookupCoordinator(
        { getContributors } as unknown as ContributorService,
        { getInstitutions: vi.fn() } as unknown as InstitutionService,
      );

      await coordinator.prefetchContributorsByOrcids([orcid]);

      await expect(coordinator.findContributorByOrcid(orcid)).resolves.toEqual(exact);
      expect(getContributors).toHaveBeenCalledOnce();
    });

    it('resolves 538 distinct valid ORCIDs with one exact batch request', async () => {
      const orcids = Array.from({ length: 538 }, (_, index) => canonicalOrcid(index));
      const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
      const { prefetch } = makeCoordinator({ getContributorsByOrcids });

      await prefetch(orcids);

      expect(getContributorsByOrcids).toHaveBeenCalledTimes(1);
      expect(getContributorsByOrcids).toHaveBeenCalledWith(orcids);
    });

    it('uses one inclusive maximum-size batch for exactly 1000 ORCIDs', async () => {
      const orcids = Array.from({ length: 1000 }, (_, index) => canonicalOrcid(index));
      const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
      const { prefetch } = makeCoordinator({ getContributorsByOrcids });

      await prefetch(orcids);

      expect(getContributorsByOrcids).toHaveBeenCalledTimes(1);
      expect(getContributorsByOrcids).toHaveBeenCalledWith(orcids);
    });

    it('chunks 1001 ORCIDs into exactly two requests of at most 1000 values', async () => {
      const orcids = Array.from({ length: 1001 }, (_, index) => canonicalOrcid(index));
      const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
      const { prefetch } = makeCoordinator({ getContributorsByOrcids });

      await prefetch(orcids);

      expect(getContributorsByOrcids).toHaveBeenCalledTimes(2);
      const batches = getContributorsByOrcids.mock.calls.map(([batch]) => batch as string[]);
      expect(batches.map((batch) => batch.length)).toEqual([1000, 1]);
      expect(batches.flat()).toEqual(orcids);
    });

    it('canonicalizes, removes invalid values, and deduplicates equivalent occurrences', async () => {
      const canonical = 'https://orcid.org/0000-0001-5109-376X';
      const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
      const { prefetch } = makeCoordinator({ getContributorsByOrcids });

      await prefetch([
        '0000-0001-5109-376x',
        canonical,
        `  ${canonical}  `,
        '',
        null,
        undefined,
        'PROPRIETARY-1234',
      ]);

      expect(getContributorsByOrcids).toHaveBeenCalledTimes(1);
      expect(getContributorsByOrcids).toHaveBeenCalledWith([canonical]);
    });

    it('seeds exact hits and explicit misses without any per-ORCID fuzzy request', async () => {
      const hitOrcid = canonicalOrcid(1);
      const missOrcid = canonicalOrcid(2);
      const hit = contributor('Stored Name', hitOrcid);
      const getContributors = vi.fn();
      const getContributorsByOrcids = vi.fn().mockResolvedValue([hit]);
      const { coordinator, prefetch } = makeCoordinator({ getContributors, getContributorsByOrcids });

      await prefetch([hitOrcid, missOrcid]);

      await expect(coordinator.findContributorByOrcid(hitOrcid)).resolves.toEqual(hit);
      await expect(coordinator.findContributorByOrcid(missOrcid)).resolves.toBeNull();
      expect(getContributors).not.toHaveBeenCalled();
    });

    it('keeps seeded ORCID identities separate from name fallback lookups', async () => {
      const hitOrcid = canonicalOrcid(1);
      const missOrcid = canonicalOrcid(2);
      const hit = contributor('Stored Name', hitOrcid);
      const sameTextAsName = contributor(hitOrcid);
      const fallback = contributor('Fallback Name');
      const getContributors = vi
        .fn()
        .mockResolvedValueOnce([sameTextAsName])
        .mockResolvedValueOnce([fallback]);
      const { coordinator, prefetch } = makeCoordinator({
        getContributors,
        getContributorsByOrcids: vi.fn().mockResolvedValue([hit]),
      });

      await prefetch([hitOrcid, missOrcid]);

      await expect(coordinator.findContributors(hitOrcid)).resolves.toEqual([sameTextAsName]);
      await expect(coordinator.findContributorByOrcid(hitOrcid)).resolves.toEqual(hit);
      await expect(coordinator.findContributorByOrcid(missOrcid)).resolves.toBeNull();
      await expect(coordinator.findContributors('Fallback Name')).resolves.toEqual([fallback]);
      expect(getContributors).toHaveBeenCalledTimes(2);
    });

    it('propagates batch failure instead of seeding the request as no match', async () => {
      const failure = new Error('502 Bad Gateway');
      const { prefetch } = makeCoordinator({
        getContributorsByOrcids: vi.fn().mockRejectedValue(failure),
      });

      await expect(prefetch([canonicalOrcid(1)])).rejects.toBe(failure);
    });
  });

  /**
   * Issue #135. ORCID is the one deterministic contributor identity a bulk import has, and the
   * backend filter it has to go through is a substring search. Everything here is about the gap
   * between those two facts.
   */
  describe('findContributorByOrcid', () => {
    const ORCID = '0000-0001-6365-5189';
    const CANONICAL = `https://orcid.org/${ORCID}`;

    const makeCoordinator = (getContributors: ReturnType<typeof vi.fn>) =>
      new ImportLookupCoordinator(
        { getContributors } as unknown as ContributorService,
        { getInstitutions: vi.fn() } as unknown as InstitutionService,
      );

    it('coalesces every occurrence of one ORCID into a single lookup for the parse', async () => {
      const match = contributor('Stored Name', ORCID);
      const getContributors = vi.fn().mockResolvedValue([match]);
      const coordinator = makeCoordinator(getContributors);

      // The three representations one file can carry for a single identity.
      const [bare, prefixed, padded] = await Promise.all([
        coordinator.findContributorByOrcid(ORCID),
        coordinator.findContributorByOrcid(CANONICAL),
        coordinator.findContributorByOrcid(`  ${ORCID}  `),
      ]);

      expect(bare).toEqual(match);
      expect(prefixed).toEqual(match);
      expect(padded).toEqual(match);
      expect(getContributors).toHaveBeenCalledTimes(1);
      // The bare identifier: a substring of every representation Thoth accepts, so the candidate
      // set is as wide as the filter can make it.
      expect(getContributors).toHaveBeenCalledWith(ORCID);
    });

    it('keeps the ORCID and full-name caches from aliasing each other', async () => {
      // A contributor whose *name* is the ORCID string is absurd but perfectly storable, and one
      // shared cache would hand the name search's array to the identity lookup.
      const namedLikeAnOrcid = contributor(ORCID, '');
      const realHolder = contributor('Stored Name', ORCID);
      const getContributors = vi
        .fn()
        .mockResolvedValueOnce([namedLikeAnOrcid])
        .mockResolvedValueOnce([namedLikeAnOrcid, realHolder]);
      const coordinator = makeCoordinator(getContributors);

      const byName = await coordinator.findContributors(ORCID);
      const byOrcid = await coordinator.findContributorByOrcid(ORCID);

      expect(byName).toEqual([namedLikeAnOrcid]);
      expect(byOrcid).toEqual(realHolder);
      expect(getContributors).toHaveBeenCalledTimes(2);
    });

    it('selects the one exact ORCID out of a substring-capable candidate set', async () => {
      // Everything the filter can legitimately return: a longer identifier containing the search
      // string, a contributor with no ORCID at all, and the actual holder.
      const substringCandidate = contributor('Substring Holder', '0000-0001-6365-51890');
      const noOrcid = contributor('No Orcid', '');
      const match = contributor('Stored Name', CANONICAL);
      const getContributors = vi.fn().mockResolvedValue([substringCandidate, noOrcid, match]);

      await expect(makeCoordinator(getContributors).findContributorByOrcid(ORCID)).resolves.toEqual(match);
    });

    it('resolves regardless of which representation each side stores the ORCID in', async () => {
      // Thoth stores the resolver form and the mapper strips it; a source file may write either,
      // and only the check character may vary in case.
      const match = contributor('Stored Name', 'https://orcid.org/0000-0001-5109-376X');
      const getContributors = vi.fn().mockResolvedValue([match]);

      await expect(
        makeCoordinator(getContributors).findContributorByOrcid('0000-0001-5109-376x'),
      ).resolves.toEqual(match);
    });

    it('rejects substring-only candidates rather than treating the filter result as identity', async () => {
      const getContributors = vi.fn().mockResolvedValue([
        contributor('Longer Holder', '0000-0001-6365-51890'),
        contributor('Unrelated', '0000-0002-1825-0097'),
      ]);

      await expect(makeCoordinator(getContributors).findContributorByOrcid(ORCID)).resolves.toBeNull();
    });

    it('returns no match when the backend holds no candidate at all', async () => {
      const getContributors = vi.fn().mockResolvedValue([]);

      await expect(makeCoordinator(getContributors).findContributorByOrcid(ORCID)).resolves.toBeNull();
    });

    it('looks nothing up for a value that is not a usable ORCID', async () => {
      const getContributors = vi.fn();
      const coordinator = makeCoordinator(getContributors);

      // Blank cells, and an ONIX NameIdentifier holding a publisher's own key rather than an
      // ORCID. Neither is an error; both simply carry no identity.
      await expect(coordinator.findContributorByOrcid('')).resolves.toBeNull();
      await expect(coordinator.findContributorByOrcid('   ')).resolves.toBeNull();
      await expect(coordinator.findContributorByOrcid(null)).resolves.toBeNull();
      await expect(coordinator.findContributorByOrcid(undefined)).resolves.toBeNull();
      await expect(coordinator.findContributorByOrcid('PROPRIETARY-1234')).resolves.toBeNull();
      await expect(coordinator.findContributorByOrcid('0000-0001-6365')).resolves.toBeNull();

      expect(getContributors).not.toHaveBeenCalled();
    });

    it('fails closed when more than one contributor somehow holds the same exact ORCID', async () => {
      // Cannot happen while `orcid_uniq_idx` holds. If it ever does, choosing between two
      // identities arbitrarily is worse than stopping the import and saying so.
      const getContributors = vi
        .fn()
        .mockResolvedValue([contributor('First Holder', ORCID), contributor('Second Holder', CANONICAL)]);

      await expect(makeCoordinator(getContributors).findContributorByOrcid(ORCID)).rejects.toThrow(
        /2 contributors with the ORCID/,
      );
    });

    it('propagates a genuine lookup rejection to every coalesced caller', async () => {
      const failure = new Error('502 Bad Gateway');
      const getContributors = vi.fn().mockRejectedValue(failure);
      const coordinator = makeCoordinator(getContributors);

      const first = coordinator.findContributorByOrcid(ORCID);
      const second = coordinator.findContributorByOrcid(CANONICAL);

      // Never softened into "Thoth holds no contributor with this ORCID", which would invite
      // creating a duplicate of a contributor the lookup simply could not see.
      await expect(first).rejects.toBe(failure);
      await expect(second).rejects.toBe(failure);
      expect(getContributors).toHaveBeenCalledTimes(1);
    });
  });
});
