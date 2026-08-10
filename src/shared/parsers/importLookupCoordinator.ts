import type { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { InstitutionService } from '@/src/entities/institution';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';

import { appConfig } from '../config';

/** Shared ceiling for distinct contributor and institution reads within one import. */
export const IMPORT_LOOKUP_CONCURRENCY = 4;

type QueuedLookup = () => void;

/**
 * Coalesces and bounds the backend reads made while one CSV or ONIX file is parsed.
 *
 * Parser instances own their coordinator, so neither successful nor rejecting lookups can leak
 * into a later import. Promises are cached before their request starts: simultaneous callers for
 * the same key therefore share both the queued work and its eventual result. A rejection remains
 * cached only for the lifetime of this parse, whose existing failure path stops the import.
 */
export class ImportLookupCoordinator {
  private readonly contributorLookups = new Map<string, Promise<ContributorEntity[]>>();
  private readonly institutionLookups = new Map<string, Promise<InstitutionEntity | null>>();
  private readonly queue: QueuedLookup[] = [];
  private activeLookups = 0;

  constructor(
    private readonly contributorService: ContributorService,
    private readonly institutionService: InstitutionService,
    private readonly concurrency = IMPORT_LOOKUP_CONCURRENCY,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error('Import lookup concurrency must be a positive integer');
    }
  }

  /** The cache key is the exact filter already passed by the parser; no name identity is inferred. */
  findContributors(filter: string): Promise<ContributorEntity[]> {
    const cached = this.contributorLookups.get(filter);

    if (cached) return cached;

    const lookup = this.schedule(() => this.contributorService.getContributors(filter));

    this.contributorLookups.set(filter, lookup);

    return lookup;
  }

  /**
   * Blank RORs carry no lookup signal. Meaningful values are trimmed, used as the cache/filter
   * key, and resolved only by strict equality with a returned entity's canonical ROR.
   */
  findInstitutionByRor(ror: string | null | undefined): Promise<InstitutionEntity | null> {
    const filter = ror?.trim() ?? '';

    if (filter.length === 0) return Promise.resolve(null);

    const cached = this.institutionLookups.get(filter);

    if (cached) return cached;

    const lookup = this.schedule(async () => {
      const institutions = await this.institutionService.getInstitutions(
        0,
        appConfig.data.maxItemsPerRequestLimit,
        filter,
      );

      return institutions.find((institution) => institution.ror === filter) ?? null;
    });

    this.institutionLookups.set(filter, lookup);

    return lookup;
  }

  private schedule<T>(lookup: () => Promise<T>): Promise<T> {
    const scheduled = new Promise<T>((resolve, reject) => {
      this.queue.push(() => {
        void Promise.resolve()
          .then(lookup)
          .then(resolve, reject)
          .finally(() => {
            this.activeLookups -= 1;
            this.drain();
          });
      });
    });

    this.drain();

    return scheduled;
  }

  private drain(): void {
    while (this.activeLookups < this.concurrency) {
      const next = this.queue.shift();

      if (!next) return;

      this.activeLookups += 1;
      next();
    }
  }
}
