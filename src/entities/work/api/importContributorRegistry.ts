import { canonicalImportOrcid } from '@/src/shared/parsers/importLookupCoordinator';

import type { ContributorId } from '../../contributor/model/contributor.types';

/**
 * The contributors one bulk import creates, so that one ORCID is only ever created once.
 *
 * A planned import can hold the same previously unseen ORCID many times over: the same author on
 * two books, in two roles on one work, or on two chapters of one. Thoth protects
 * `contributor.orcid` with a unique index and is right to, so the second attempt is rejected and
 * the import stops partway — which is exactly the failure issue #135 records.
 *
 * What is cached is the **in-flight Promise**, not the contributor id it will resolve to. A
 * completed-value-only cache would still race: `createWork` creates a work's contributions with
 * `Promise.all`, and a top-level work creates its chapters concurrently, so two occurrences of
 * one ORCID routinely start before either has finished. Storing the Promise the moment creation
 * begins means the second occurrence joins the first rather than starting its own.
 *
 * The registry is created by, and belongs to, a single `bulkCreateWorks()` call:
 *
 * - it is never global, so no import inherits contributor ids from an earlier one, which would
 *   be a claim about server state this process has no right to make;
 * - it never reaches ordinary `createWork`/`createContribution`, which keep their existing
 *   behaviour untouched;
 * - a rejected creation stays rejected for every occupant of that key. A failed create is a
 *   failed import, and sharing identity must never launder it into a success.
 *
 * It deliberately does *not* deduplicate by name. Two people may share a name, and inferring
 * identity from one is the ambiguity the contributor-selection step exists to resolve.
 */
export class ImportContributorRegistry {
  private readonly creations = new Map<string, Promise<ContributorId>>();

  /**
   * The contributor id for this occurrence: the one already being created for its ORCID, or a
   * newly started creation.
   *
   * `createContributor` is invoked and its Promise stored in the same synchronous step, before
   * anything awaits it. That ordering is the whole guarantee — an `await` between the two would
   * reopen the window this class exists to close.
   *
   * A value that is not a usable ORCID carries no identity, so it is passed straight through to
   * the caller's own creation and no entry is kept for it.
   */
  resolve(orcid: string | null | undefined, createContributor: () => Promise<ContributorId>): Promise<ContributorId> {
    const key = canonicalImportOrcid(orcid);

    if (key === null) return createContributor();

    const inFlight = this.creations.get(key);

    if (inFlight) return inFlight;

    const creation = createContributor();

    this.creations.set(key, creation);

    return creation;
  }
}
