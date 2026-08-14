import type { ImportExecutionStage, ImportPlan } from '@/src/shared/types';
import { getDisplayTitle } from '@/src/shared/utils/work';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';

/**
 * The session execution ledger: one client-side receipt row per top-level work in the plan.
 *
 * It is derived, never stored. Nothing here is persisted, sent to the API, or written back into
 * {@link ImportPlan} — the plan is creation intent, this is a read-only account of what happened
 * to it, rebuilt from the plan and the Iteration 1 execution truth on every render. Chapters are
 * part of a work's execution path, so they update their parent work's row rather than earning a
 * row of their own.
 */

export type ImportLedgerStatus =
  /** Top-level work not yet started while execution can still reach it. */
  | 'pending'
  /** The current top-level work is in flight. */
  | 'importing'
  /** The whole existing work → chapters → series path returned successfully. */
  | 'completed'
  /** Execution stopped while this work was current; it may be partially created, not rolled back. */
  | 'failed'
  /** A work after the failed one that execution never began. */
  | 'notAttempted';

export type ImportLedgerEntry = {
  /** 1-based position among the plan's top-level works, in source/plan order. */
  position: number;
  title: string;
  /** DOI, or the source reference when there is no DOI. Absent when the plan supplies neither. */
  reference?: string;
  /** How many chapters this work would create; 0 when it has none. */
  chapterCount: number;
  status: ImportLedgerStatus;
  /**
   * The truthful current/terminal stage, carried only by the row that is `importing` or `failed`.
   * A `pending`, `completed`, or `notAttempted` row has no stage — showing one would fabricate
   * detail for a work that is not (or is no longer) being worked on.
   */
  stage?: ImportExecutionStage;
};

/** Identity a row carries whether or not execution has reached it, minus its status/stage. */
type LedgerIdentity = Pick<ImportLedgerEntry, 'position' | 'title' | 'reference' | 'chapterCount'>;

/**
 * The identity of every top-level work, drawn from the plan exactly as `WorkService.workContext`
 * draws it: DOI preferred as the reference, then the source reference, then none; the display
 * title; and the number of chapters that name this work as their parent. Computing it here, from
 * the same plan the service reads, is what lets a `pending` row read identically to the way it
 * will read once it becomes `importing` — no second source of truth, no drift.
 */
const ledgerIdentities = (plan: ImportPlan): LedgerIdentity[] =>
  plan.works.map((work, index) => {
    const doi = work.doi?.trim();
    const reference = work.reference?.trim();
    const chapterCount = plan.chapters.filter((chapter) => chapter.relationId === work.id).length;

    return {
      position: index + 1,
      title: getDisplayTitle(work.titles).title,
      reference: doi || reference || undefined,
      chapterCount,
    };
  });

/**
 * Builds the session ledger from the plan and the current execution state.
 *
 * Pure and total: it reads the plan and the state, and returns fresh rows without mutating either.
 * Completion is taken from the execution model's own `completed` count — the number of works whose
 * full path has already returned — never inferred from a stage merely being entered. A failed row
 * is reported as `failed`, never as rolled back, and the works after it as `notAttempted`, which
 * says only that execution never began for them.
 */
export const deriveImportLedger = (plan: ImportPlan, state: ImportExecutionState): ImportLedgerEntry[] => {
  const identities = ledgerIdentities(plan);

  const allPending = (): ImportLedgerEntry[] => identities.map((identity) => ({ ...identity, status: 'pending' }));

  switch (state.phase) {
    case 'idle':
      return allPending();

    case 'running': {
      const { completed, current, stage } = state;

      // Between starting and the first reading there is no current book, so nothing has begun yet.
      if (!current) return allPending();

      return identities.map((identity) => {
        // Order matters: the current row is `importing` even though its position sits just past
        // the `completed` count; only the rows strictly within that count are proven complete.
        if (identity.position === current.position) {
          return { ...identity, status: 'importing', stage: stage ?? undefined };
        }

        if (identity.position <= completed) return { ...identity, status: 'completed' };

        return { ...identity, status: 'pending' };
      });
    }

    case 'succeeded':
      return identities.map((identity) => ({ ...identity, status: 'completed' }));

    case 'failed': {
      const { completed, current, stage } = state.failure;

      return identities.map((identity) => {
        if (identity.position === current.position) return { ...identity, status: 'failed', stage };

        if (identity.position <= completed) return { ...identity, status: 'completed' };

        return { ...identity, status: 'notAttempted' };
      });
    }

    default:
      return allPending();
  }
};
