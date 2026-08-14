'use client';

import { useReducer } from 'react';

import { useBulkCreateWorks } from '@/src/entities/work';
import { extractErrorMessage, ImportExecutionError } from '@/src/entities/work/model/import-execution.error';
import type {
  ImportExecutionFailure,
  ImportExecutionObserver,
  ImportExecutionProgress,
  ImportExecutionStage,
  ImportExecutionSummary,
  ImportExecutionWorkContext,
  ImportPlan,
  ImportSource,
} from '@/src/shared/types';
import { getDisplayTitle } from '@/src/shared/utils/work';

/**
 * The four states a bulk import passes through, held apart so a component can render exactly one
 * of them. `idle` before it starts; `running` while it works, carrying the latest reading;
 * `succeeded`/`failed` afterwards, each carrying what the modal needs to report the outcome.
 *
 * `running` may briefly have no `current` — between starting and the first reading — so the UI
 * shows a plain "starting" state rather than inventing a book that is not being processed yet.
 */
export type ImportExecutionState =
  | { phase: 'idle' }
  | {
      phase: 'running';
      source: ImportSource;
      total: number;
      completed: number;
      current: ImportExecutionWorkContext | null;
      stage: ImportExecutionStage | null;
    }
  | { phase: 'succeeded'; source: ImportSource; summary: ImportExecutionSummary; occurredAt: string }
  | { phase: 'failed'; source: ImportSource; failure: ImportExecutionFailure; occurredAt: string };

type ImportExecutionAction =
  | { type: 'start'; source: ImportSource; total: number }
  | { type: 'progress'; progress: ImportExecutionProgress }
  | { type: 'succeed'; occurredAt: string }
  | { type: 'fail'; failure: ImportExecutionFailure; occurredAt: string }
  | { type: 'reset' };

const IDLE: ImportExecutionState = { phase: 'idle' };

const reducer = (state: ImportExecutionState, action: ImportExecutionAction): ImportExecutionState => {
  switch (action.type) {
    case 'start':
      return { phase: 'running', source: action.source, total: action.total, completed: 0, current: null, stage: null };

    case 'progress':
      // Readings only mean anything while running; one arriving in any other phase is ignored
      // rather than allowed to resurrect a finished run.
      if (state.phase !== 'running') return state;

      return {
        ...state,
        total: action.progress.total,
        completed: action.progress.completed,
        current: action.progress.current,
        stage: action.progress.stage,
      };

    case 'succeed':
      if (state.phase !== 'running') return state;

      return {
        phase: 'succeeded',
        source: state.source,
        summary: { total: state.total, completed: state.total },
        // Captured once here, at the terminal transition, so the report timestamp is stable and
        // does not move on every re-render the way `new Date()` in the view would.
        occurredAt: action.occurredAt,
      };

    case 'fail':
      if (state.phase !== 'running') return state;

      return { phase: 'failed', source: state.source, failure: action.failure, occurredAt: action.occurredAt };

    case 'reset':
      return IDLE;

    default:
      return state;
  }
};

/**
 * Turns whatever the run threw into a failure the modal can render. An
 * {@link ImportExecutionError} already carries the execution context and the original message, so
 * it is used as-is. Anything else is a path that should not happen — the service wraps every
 * failure — so it falls back to the least misleading thing available: the first work, the work
 * stage, nothing processed, and the message we can extract.
 */
const toFailure = (error: unknown, plan: ImportPlan, total: number): ImportExecutionFailure => {
  if (error instanceof ImportExecutionError) {
    return { ...error.context, message: error.message };
  }

  const firstWork = plan.works[0];
  const current: ImportExecutionWorkContext = firstWork
    ? { position: 1, title: getDisplayTitle(firstWork.titles).title, chapterCount: 0 }
    : { position: 0, title: '', chapterCount: 0 };

  return { total, completed: 0, current, stage: 'work', message: extractErrorMessage(error) };
};

/**
 * Owns the execution state for one bulk import and drives it through
 * {@link useBulkCreateWorks}. The plan and the observer are handed to the service together; every
 * reading the service emits becomes a state update, and the terminal outcome is derived from
 * whether the run returned or threw. Query invalidation and the toast stay in
 * {@link useBulkCreateWorks} — this hook adds only the persistent, in-modal execution state.
 */
export const useBulkImportExecution = () => {
  const { bulkCreateWorks } = useBulkCreateWorks();
  const [state, dispatch] = useReducer(reducer, IDLE);

  const runImport = async (plan: ImportPlan, source: ImportSource) => {
    const total = plan.works.length;

    dispatch({ type: 'start', source, total });

    const observer: ImportExecutionObserver = {
      onProgress: (progress) => dispatch({ type: 'progress', progress }),
    };

    try {
      await bulkCreateWorks(plan, observer);
      dispatch({ type: 'succeed', occurredAt: new Date().toISOString() });
    } catch (error) {
      // The rejection is handled here, so it never surfaces as an unhandled rejection; the
      // failure state is what the user sees, the toast from useBulkCreateWorks is supplementary.
      dispatch({ type: 'fail', failure: toFailure(error, plan, total), occurredAt: new Date().toISOString() });
    }
  };

  const reset = () => dispatch({ type: 'reset' });

  return { state, runImport, reset };
};
