import type { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { InstitutionService } from '@/src/entities/institution';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';

import { appConfig } from '../config';
import { convertOrchidIdToText } from '../utils/conversions/formFields';
import { normalizedOrcidId } from '../utils/helpers/normalizedOrcidId';
import { orcidValidation } from '../utils/validations';

/** Shared ceiling for distinct contributor and institution reads within one import. */
export const IMPORT_LOOKUP_CONCURRENCY = 4;
const CONTRIBUTOR_ORCID_BATCH_SIZE = 1000;

type QueuedLookup = () => void;

/**
 * The single representation an import compares ORCIDs in, or `null` when the value carries no
 * usable ORCID identity at all.
 *
 * ORCID is the one deterministic contributor identity signal a bulk import has, so both ends of
 * every comparison have to arrive in the same shape. They do not naturally: a CSV cell holds
 * whatever the publisher typed, ONIX `NameIdentifier/IDValue` holds whatever identifier scheme
 * the file used, and the contributor mapper strips the resolver prefix from what Thoth
 * stored. Canonicalising through the app's existing contract — `orcidValidation` for what
 * counts as an ORCID, `normalizedOrcidId` for how Thoth writes one — means the value that is
 * compared is the value that is stored.
 *
 * Returning `null` rather than throwing is deliberate: a blank cell, or an ONIX identifier that
 * is a publisher's proprietary key rather than an ORCID, is not an error. It simply means this
 * occurrence has no ORCID identity, and everything downstream falls back to the name-based
 * behaviour it has always had.
 */
export const canonicalImportOrcid = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  if (trimmed.length === 0) return null;

  // Canonicalise first, then validate — the order `canonicaliseDoi` and `canonicaliseRor`
  // already use for imported identifiers. Only the trailing check character of an ORCID can be a
  // letter, so upper-casing the identifier is safe, and it makes `…-376x` and `…-376X` the one
  // ORCID they are rather than two. `orcidValidation` requires the upper-case form.
  const canonical = normalizedOrcidId(convertOrchidIdToText(trimmed).toUpperCase());

  if (canonical === null) return null;

  // Held to the app's own ORCID grammar, so a value Thoth would reject never becomes an identity
  // key. That grammar is a shape check, not a checksum: this deliberately does not invent a
  // stricter rule than the one the rest of the app already applies.
  return orcidValidation.safeParse(canonical).success ? canonical : null;
};

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
  /**
   * Kept apart from {@link contributorLookups} on purpose. That map is keyed by the raw filter a
   * name search passed, this one by a canonical ORCID, and the two hold different result types.
   * One shared map would let a contributor literally named after an ORCID collide with the
   * identity lookup for that ORCID.
   */
  private readonly orcidLookups = new Map<string, Promise<ContributorEntity | null>>();
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
   * Resolves every usable ORCID for one import through the exact batch endpoint, then records both
   * hits and misses in the parse-scoped identity cache before row/product parsing starts.
   */
  async prefetchContributorsByOrcids(orcids: Array<string | null | undefined>): Promise<void> {
    const canonicalOrcids = Array.from(
      new Set(orcids.map((orcid) => canonicalImportOrcid(orcid)).filter((orcid): orcid is string => orcid !== null)),
    );

    if (canonicalOrcids.length === 0) return;

    // The concrete ContributorService always supplies the batch endpoint. Keep the coordinator's
    // existing lazy exact-match path available to older injected adapters that implement only the
    // original contributor search contract; they remain correct, but do not receive the batch
    // performance improvement until they expose the new method.
    const getContributorsByOrcids = this.contributorService.getContributorsByOrcids;

    if (typeof getContributorsByOrcids !== 'function') return;

    const batches: string[][] = [];

    for (let offset = 0; offset < canonicalOrcids.length; offset += CONTRIBUTOR_ORCID_BATCH_SIZE) {
      batches.push(canonicalOrcids.slice(offset, offset + CONTRIBUTOR_ORCID_BATCH_SIZE));
    }

    // Do not seed any miss until every request succeeds. A failed batch is a failed prefetch, not
    // evidence that Thoth has no contributor for the identifiers in that batch.
    const contributors = (
      await Promise.all(batches.map((batch) => getContributorsByOrcids.call(this.contributorService, batch)))
    ).flat();
    const requested = new Set(canonicalOrcids);
    const exactByOrcid = new Map<string, ContributorEntity>();

    contributors.forEach((contributor) => {
      const canonical = canonicalImportOrcid(contributor.orcid);

      if (canonical === null || !requested.has(canonical)) return;

      if (exactByOrcid.has(canonical)) {
        throw new Error(
          `Thoth holds more than one contributor with the ORCID ${canonical}; the import cannot choose between them`,
        );
      }

      exactByOrcid.set(canonical, contributor);
    });

    canonicalOrcids.forEach((canonical) => {
      this.orcidLookups.set(canonical, Promise.resolve(exactByOrcid.get(canonical) ?? null));
    });
  }

  /**
   * The one existing contributor holding exactly this ORCID, or `null` when Thoth holds none.
   *
   * `contributors(filter:)` is a substring search, so its result is a candidate set and never an
   * identity: filtering on `0000-0001-6365-5189` can return a contributor whose ORCID merely
   * contains those characters. Identity is therefore decided here, by canonical equality, and
   * only a value that survives {@link canonicalImportOrcid} is looked up at all.
   *
   * More than one exact match cannot happen while the backend's `orcid_uniq_idx` holds. If it
   * somehow does, this fails the parse rather than picking one arbitrarily: silently choosing
   * between two identities is worse than stopping and saying so.
   *
   * A transport, auth or server failure propagates untouched. `null` here means "Thoth holds no
   * contributor with this ORCID", and a lookup that never completed may never claim that.
   */
  findContributorByOrcid(orcid: string | null | undefined): Promise<ContributorEntity | null> {
    const canonical = canonicalImportOrcid(orcid);

    if (canonical === null) return Promise.resolve(null);

    const cached = this.orcidLookups.get(canonical);

    if (cached) return cached;

    const lookup = this.schedule(async () => {
      // The bare identifier, which is a substring of every representation Thoth accepts, so the
      // candidate set is as wide as the filter can make it and narrowing is left to this side.
      const candidates = await this.contributorService.getContributors(convertOrchidIdToText(canonical));
      const exact = candidates.filter((candidate) => canonicalImportOrcid(candidate.orcid) === canonical);

      if (exact.length > 1) {
        throw new Error(
          `Thoth holds ${exact.length} contributors with the ORCID ${canonical}; the import cannot choose between them`,
        );
      }

      return exact[0] ?? null;
    });

    this.orcidLookups.set(canonical, lookup);

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
