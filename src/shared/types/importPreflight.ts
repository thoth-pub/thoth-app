import type { WorkId } from '@/src/entities/work/model/work.types';

/**
 * What a bulk import would create, and what about it looks like it might already exist, worked
 * out before anything is created.
 *
 * A preflight is reads only. It answers two questions at the confirmation boundary: what is in
 * this plan, and does any of it carry an identifier that something else already carries. It
 * decides nothing. Nothing here removes a work from an {@link ImportPlan}, replaces one with an
 * existing `WorkId`, or reaches the mutation — the plan the user confirms is the plan that runs,
 * findings or no findings.
 *
 * That restraint is deliberate. "Two records share a DOI" is evidence; "two records are the same
 * work" is a policy decision about work identity, with consequences for updates, idempotency and
 * merging that this stage has no mandate to make. So these types describe signals, and the user
 * decides.
 */

/**
 * Which identifier a signal rests on.
 *
 * Only these two. A shared title, contributor, imprint, edition, `reference` or ONIX
 * RecordReference is not a duplicate signal here: those are weaker evidence, and reading them as
 * duplicates is the identity policy this stage is staying out of.
 */
export type ImportDuplicateBasis = 'doi' | 'isbn';

/** One planned top-level work, identified well enough to point at a row in the preview. */
export type ImportReportWork = {
  workId: WorkId;
  /** Position in `plan.works`, which is source-file order. */
  importIndex: number;
  title: string;
};

/**
 * A work already in Thoth that carries a planned identifier.
 *
 * A display summary rather than a `WorkEntity`: the report is shown, not acted on, and holding a
 * whole existing work would invite code that starts treating it as the planned work's other
 * half.
 */
export type ExistingWorkMatch = {
  workId: WorkId;
  title: string;
  imprintId: string;
  doi: string;
  isbns: string[];
};

/**
 * One identifier value that more than one record carries.
 *
 * Grouped by value, not by work, so an identifier shared by two imported works and two existing
 * ones is a single finding naming all four rather than a scattering of pairs. No existing match
 * is picked as the best one: several existing works sharing an identifier is exactly the kind of
 * thing a report should show rather than resolve.
 *
 * A work with both a matching DOI and a matching ISBN produces two findings, one per basis. Two
 * independent signals are better evidence than one, and collapsing them into a single verdict
 * would be that identity decision again.
 */
export type ImportDuplicateFinding = {
  basis: ImportDuplicateBasis;
  /** The normalised value the signal rests on — see `normaliseDoi` / `normaliseIsbn`. */
  value: string;
  /** Planned works carrying it, in `plan.works` order. */
  importedWorks: ImportReportWork[];
  /** Existing Thoth works carrying it. Empty when the signal is internal to the upload. */
  existingWorks: ExistingWorkMatch[];
};

/**
 * The shape of the import, plus how much of it this preflight was actually able to check.
 *
 * The coverage counts are not decoration. This preflight compares DOIs and ISBNs and nothing
 * else, so a report with no findings means "no matching DOI or ISBN was found", which is a much
 * smaller claim than "there are no duplicates". A file where most works carry neither identifier
 * has barely been checked at all, and the summary has to be able to say so.
 */
export type ImportPreflightSummary = {
  works: number;
  chapters: number;
  existingSeries: number;
  proposedSeries: number;

  worksWithDoi: number;
  worksWithIsbn: number;
  worksWithAnyCheckedIdentifier: number;
  worksWithoutCheckedIdentifier: number;

  /** Distinct planned works named by at least one finding. */
  affectedWorks: number;
  duplicateFindings: number;
};

/**
 * A snapshot taken before confirmation, describing the plan as it stands and the duplicate
 * signals found against Thoth as it stood when the lookups ran.
 *
 * Advisory, and not a lock. Another user or another import can create a matching work between
 * this report and the confirmation that follows it; this stage adds no reservation, uniqueness
 * constraint, transaction or create-or-get to prevent that. It is also not an execution report:
 * it describes what would be created, never what was.
 */
export type ImportPreflightReport = {
  summary: ImportPreflightSummary;
  duplicateFindings: ImportDuplicateFinding[];
};

/** One normalised value to look up, and what kind of identifier it is. */
export type ImportIdentifier = {
  basis: ImportDuplicateBasis;
  value: string;
};

/**
 * Existing Thoth works that carry each looked-up identifier, keyed by `importIdentifierKey`.
 *
 * A map rather than a list so the report builder can ask about one identifier directly instead
 * of scanning every fetched work for every identifier. An identifier that was looked up and
 * matched nothing may be absent or map to an empty array; both mean the same thing.
 */
export type ExistingWorkMatchesByIdentifier = ReadonlyMap<string, ExistingWorkMatch[]>;
