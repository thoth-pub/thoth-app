/**
 * Runtime execution model for a bulk import.
 *
 * This is deliberately separate from {@link ImportPlan}, which is creation intent only. These
 * types describe what is *happening* to that plan as the app works through it: how far it has
 * got, which work it is on, and — if it stops — where and why. None of it is ever sent to the
 * API; it exists so the modal can report the client-side run truthfully.
 *
 * The primary unit is the top-level work/book, never an arbitrary count of GraphQL mutations.
 * A CSV book is only ever counted once its whole existing execution path (work, then chapters,
 * then series membership) has returned successfully. An ONIX plan counts execution units instead
 * (thoth-app#187): one per resolved Work group, whether it creates a Work, attaches to an existing
 * one or has nothing to do, each counted once every action it owns has returned.
 */

/** Which importer produced the plan. Used for display and the copyable error report. */
export type ImportType = 'csv' | 'onix';

/**
 * The little the modal keeps about where the plan came from, so a failure report can name the
 * file the publisher uploaded. Held beside the plan, never inside it, and carrying no file
 * contents — only the type and the filename.
 */
export type ImportSource = {
  type: ImportType;
  filename: string;
};

/**
 * The stage a CSV top-level work is at. These mirror the three things
 * `WorkService.bulkCreateWorks` does for each CSV work, in order:
 * - `work`: creating the top-level work itself;
 * - `chapters`: creating its chapters, if it has any;
 * - `series`: resolving/creating its series and attaching the work to it, if applicable.
 */
export type CsvImportExecutionStage = 'work' | 'chapters' | 'series';

/**
 * The binding stage vocabulary of an ONIX execution unit (thoth-app#187), in the order a unit runs them. A unit with no
 * action is at `noop`, and issues no mutation.
 */
export type OnixImportExecutionStage =
  | 'noop'
  | 'work'
  | 'publication'
  | 'chapter'
  | 'containedWork'
  | 'additionalResource'
  | 'bookReview'
  | 'endorsement'
  | 'award'
  | 'series'
  | 'relation';

export type ImportExecutionStage = CsvImportExecutionStage | OnixImportExecutionStage;

/** What an ONIX execution unit targets: a Work it creates, an exact existing Work, or nothing to do at all. */
export type ImportExecutionUnitKind = 'NEW_WORK' | 'EXISTING_WORK' | 'NOOP';

/**
 * Enough of the current top-level work to identify it to a human, drawn from the plan rather
 * than fabricated. A work with no DOI or reference simply has no `reference`.
 */
export type ImportExecutionWorkContext = {
  /** 1-based position of this work among the plan's top-level works, or of this ONIX execution unit among its units. */
  position: number;
  title: string;
  /** DOI, or the source reference when there is no DOI. Absent when the plan supplies neither. */
  reference?: string;
  /** How many chapters this work will create; 0 when it has none. */
  chapterCount: number;
  /** ONIX only: what the execution unit targets. Absent for a CSV work, which always creates its Work. */
  unit?: ImportExecutionUnitKind;
};

/**
 * A single progress reading emitted while the import runs.
 *
 * `completed` counts only the top-level works whose full path has already returned — never the
 * one described by `current`, which is still in flight. So while book 12 of 48 is being created,
 * `completed` is 11, `current.position` is 12, and 36 are not yet started.
 */
export type ImportExecutionProgress = {
  /** Total top-level works in the plan (M), or an ONIX plan's execution units. */
  total: number;
  /** Top-level works, or ONIX execution units, fully processed before the current one. */
  completed: number;
  current: ImportExecutionWorkContext;
  stage: ImportExecutionStage;
};

/** Terminal success: every top-level work fully processed. */
export type ImportExecutionSummary = {
  total: number;
  completed: number;
};

/** A compensating mutation an ONIX execution unit can run, or a write whose outcome is not known. */
export type ImportCleanupOperation =
  | 'DELETE_WORK'
  | 'DELETE_PUBLICATION'
  | 'DELETE_WORK_RELATION'
  | 'DELETE_ADDITIONAL_RESOURCE'
  | 'DELETE_BOOK_REVIEW'
  | 'DELETE_ENDORSEMENT'
  | 'DELETE_AWARD'
  /** A create whose request was sent and whose result never named what it created: nothing proves it absent. */
  | 'CREATE_OUTCOME_UNKNOWN';

/** One write the failed unit's cleanup removed, with the exact id its delete mutation returned. */
export type ImportCleanupRecord = {
  readonly operation: Exclude<ImportCleanupOperation, 'CREATE_OUTCOME_UNKNOWN'>;
  readonly entityId: string;
  readonly actionKey: string;
  readonly stage: OnixImportExecutionStage;
};

/**
 * One write the failed unit's cleanup could not prove gone: a compensating delete that threw, or returned another id or
 * none, or a create whose outcome is unknown. It names the operation and the id only - never a payload, token or source
 * byte.
 */
export type ImportCleanupFailure = {
  readonly operation: ImportCleanupOperation;
  /** The id of what may be left, where one is known. */
  readonly entityId: string | null;
  readonly actionKey: string;
  readonly stage: OnixImportExecutionStage;
  readonly reason: string;
};

/**
 * What became of the failed ONIX execution unit's own writes (thoth-app#187), and what that means for trying again. A
 * retry is always the complete file again, through a fresh validation, planning and preflight - never this plan
 * replayed.
 *
 * - `NOT_REQUIRED`: the unit issued no mutation, so nothing of it can have been saved.
 * - `VERIFIED`: every write the unit made, or may have made, was removed again, each proven by its delete returning
 *   that exact id. A Contributor the unit created may survive as an unreferenced row; that residue is accepted and is
 *   never deleted.
 * - `FAILED_OR_UNKNOWN`: something the unit wrote, or may have written, is not proven gone; it must be reconciled by
 *   hand first.
 */
export type ImportCleanupDisposition =
  | { readonly status: 'NOT_REQUIRED'; readonly retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' }
  | {
      readonly status: 'VERIFIED';
      readonly retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT';
      readonly compensated: readonly ImportCleanupRecord[];
    }
  | {
      readonly status: 'FAILED_OR_UNKNOWN';
      readonly retry: 'MANUAL_RECONCILIATION_REQUIRED';
      readonly compensated: readonly ImportCleanupRecord[];
      readonly failures: readonly ImportCleanupFailure[];
    };

/**
 * Execution context carried by a terminal failure.
 *
 * `completed` is the number of top-level works fully processed *before* the failure; `current`
 * is the work that was in flight; `total - current.position` books were never started.
 *
 * A CSV failure carries no `cleanup`: the work it stopped on may be partially created, and was not
 * rolled back. An ONIX failure always does (thoth-app#187): `stage` is the stage that failed, never
 * the cleanup that followed, and `cleanup` is what became of the failed unit's own writes.
 */
export type ImportExecutionFailureContext = {
  total: number;
  completed: number;
  current: ImportExecutionWorkContext;
  stage: ImportExecutionStage;
  /** ONIX only: the failed execution unit's cleanup, and so whether the complete file may be tried again. */
  cleanup?: ImportCleanupDisposition;
};

/**
 * A terminal failure the UI can render, pairing the execution context with the original,
 * useful error message the API/app already produced.
 */
export type ImportExecutionFailure = ImportExecutionFailureContext & {
  message: string;
};

/**
 * The narrow boundary the execution service reports through. A single optional callback keeps
 * `WorkService` decoupled from React: it emits readings, and whoever passed the observer decides
 * what to do with them.
 */
export type ImportExecutionObserver = {
  onProgress?: (progress: ImportExecutionProgress) => void;
};
