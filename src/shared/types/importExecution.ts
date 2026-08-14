/**
 * Runtime execution model for a bulk import.
 *
 * This is deliberately separate from {@link ImportPlan}, which is creation intent only. These
 * types describe what is *happening* to that plan as the app works through it: how far it has
 * got, which work it is on, and — if it stops — where and why. None of it is ever sent to the
 * API; it exists so the modal can report the client-side run truthfully.
 *
 * The primary unit is the top-level work/book, never an arbitrary count of GraphQL mutations.
 * A book is only ever counted once its whole existing execution path (work, then chapters, then
 * series membership) has returned successfully.
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
 * The stage a top-level work is at. These mirror the three things
 * `WorkService.bulkCreateWorks` does for each work, in order:
 * - `work`: creating the top-level work itself;
 * - `chapters`: creating its chapters, if it has any;
 * - `series`: resolving/creating its series and attaching the work to it, if applicable.
 */
export type ImportExecutionStage = 'work' | 'chapters' | 'series';

/**
 * Enough of the current top-level work to identify it to a human, drawn from the plan rather
 * than fabricated. A work with no DOI or reference simply has no `reference`.
 */
export type ImportExecutionWorkContext = {
  /** 1-based position of this work among the plan's top-level works. */
  position: number;
  title: string;
  /** DOI, or the source reference when there is no DOI. Absent when the plan supplies neither. */
  reference?: string;
  /** How many chapters this work will create; 0 when it has none. */
  chapterCount: number;
};

/**
 * A single progress reading emitted while the import runs.
 *
 * `completed` counts only the top-level works whose full path has already returned — never the
 * one described by `current`, which is still in flight. So while book 12 of 48 is being created,
 * `completed` is 11, `current.position` is 12, and 36 are not yet started.
 */
export type ImportExecutionProgress = {
  /** Total top-level works in the plan (M). */
  total: number;
  /** Top-level works fully processed before the current one. */
  completed: number;
  current: ImportExecutionWorkContext;
  stage: ImportExecutionStage;
};

/** Terminal success: every top-level work fully processed. */
export type ImportExecutionSummary = {
  total: number;
  completed: number;
};

/**
 * Execution context carried by a terminal failure.
 *
 * `completed` is the number of top-level works fully processed *before* the failure; `current`
 * is the work that was in flight and may be partially created; `total - current.position` books
 * were never started. Nothing here claims `current` was rolled back — it was not.
 */
export type ImportExecutionFailureContext = {
  total: number;
  completed: number;
  current: ImportExecutionWorkContext;
  stage: ImportExecutionStage;
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
