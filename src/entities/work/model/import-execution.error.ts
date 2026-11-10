import type { CsvImportPreExecutionRejectionContext, ImportExecutionFailureContext } from '@/src/shared/types';

/**
 * Thrown by `WorkService.bulkCreateWorks` when a run stops partway.
 *
 * It preserves the original, useful error message — the one the GraphQL service already
 * produced and the toast already shows — as its own `message`, so nothing downstream has to
 * dig it back out. Alongside it, `context` records where the run stopped: which top-level work,
 * at which stage, and how many books were fully processed before it. `cause` keeps the original
 * error for anyone who wants it, but it is never surfaced to the user.
 *
 * The message is deliberately not rewritten. Wrapping it in "import failed: …" would bury the
 * one line a publisher needs to send to support.
 */
export class ImportExecutionError extends Error {
  readonly context: ImportExecutionFailureContext;

  constructor(message: string, context: ImportExecutionFailureContext, cause?: unknown) {
    super(message, { cause });
    this.name = 'ImportExecutionError';
    this.context = context;
  }
}

/**
 * Thrown by `WorkService.bulkCreateWorks` when it refuses a CSV plan before execution (APP-CSV-D11-A,
 * thoth-app#281): the plan holds a Work or chapter with a published status (ACTIVE, WITHDRAWN or SUPERSEDED), which a
 * CSV bulk import temporarily does not execute.
 *
 * It is deliberately not an {@link ImportExecutionError}. Nothing was in flight: the refusal comes before any creation
 * mutation and before any progress reading, so it carries no current Work, stage or completed count - only the
 * violations, and the plan's top-level Work count.
 *
 * Its `message` is one fixed English sentence, untranslated because the service has no translator, exactly as an
 * `ImportExecutionError` carries the API's message verbatim. The publisher-facing wording is the modal's.
 */
export class CsvImportPreExecutionRejection extends Error {
  readonly context: CsvImportPreExecutionRejectionContext;

  constructor(context: CsvImportPreExecutionRejectionContext) {
    const count = context.violations.length;

    super(
      `CSV bulk import refused before execution because the plan contains published-status Works (${count} ${count === 1 ? 'violation' : 'violations'}), so nothing was created.`,
    );
    this.name = 'CsvImportPreExecutionRejection';
    this.context = context;
  }
}

/**
 * Pulls the useful message out of whatever was thrown, without ever exposing a stack trace or
 * runtime internals. An `Error` gives its `message`; anything else is stringified as a last
 * resort so the report is never empty.
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (typeof error === 'string') return error;

  return String(error);
};
