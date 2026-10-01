import type {
  ImportCleanupDisposition,
  ImportCleanupOperation,
  ImportExecutionStage,
  ImportExecutionUnitKind,
  ImportSource,
} from '@/src/shared/types';

import type { ImportLedgerEntry, ImportLedgerStatus } from './importLedger';

/**
 * Builds the plain-text session import report — the whole top-level-work ledger, for a completed
 * or a stopped run alike — that a publisher can copy or download and send to Thoth support.
 *
 * It is assembled only from what the modal already holds: the source file, the derived ledger, the
 * terminal timestamp, and — for a stopped run — the useful error message the API produced. It
 * carries no stack trace, no tokens, no headers, no file contents: only the facts a developer
 * needs to find where the run stopped. The wording is fixed English on purpose, so a report
 * reaching support reads the same whatever locale the publisher runs the app in.
 *
 * Copy and Download share this one builder, so the two can never drift semantically. It reads its
 * inputs and returns a string; it mutates neither the ledger nor the execution state.
 */

const IMPORT_TYPE_LABEL: Record<ImportSource['type'], string> = {
  csv: 'CSV',
  onix: 'ONIX',
};

const STAGE_LABEL: Record<ImportExecutionStage, string> = {
  noop: 'Nothing to do',
  work: 'Creating the work',
  publication: 'Creating publications',
  chapters: 'Creating chapters',
  chapter: 'Creating chapters',
  containedWork: 'Creating contained works',
  additionalResource: 'Creating additional resources',
  bookReview: 'Creating book reviews',
  endorsement: 'Creating endorsements',
  award: 'Creating awards',
  series: 'Attaching series membership',
  relation: 'Creating work relations',
};

const UNIT_LABEL: Record<ImportExecutionUnitKind, string> = {
  NEW_WORK: 'New work',
  EXISTING_WORK: 'Existing work',
  NOOP: 'Nothing to do (already in Thoth)',
};

const CLEANUP_OPERATION_LABEL: Record<ImportCleanupOperation, string> = {
  DELETE_WORK: 'Work',
  DELETE_PUBLICATION: 'Publication',
  DELETE_WORK_RELATION: 'Work relation',
  DELETE_ADDITIONAL_RESOURCE: 'Additional resource',
  DELETE_BOOK_REVIEW: 'Book review',
  DELETE_ENDORSEMENT: 'Endorsement',
  DELETE_AWARD: 'Award',
  CREATE_OUTCOME_UNKNOWN: 'Write whose outcome is unknown',
};

const STATUS_LABEL: Record<ImportLedgerStatus, string> = {
  pending: 'Pending',
  importing: 'Importing',
  completed: 'Completed',
  failed: 'Failed',
  notAttempted: 'Not attempted',
};

export type ImportReportInput = {
  source: ImportSource;
  /** ISO timestamp captured once when the run reached its terminal state. */
  timestamp: string;
  /** The derived session ledger, one entry per top-level work in plan order. */
  ledger: ImportLedgerEntry[];
  /**
   * Present only for a stopped run: the original, useful API/application error message, and for an ONIX run what became
   * of the failed unit's own writes (thoth-app#187).
   */
  failure?: { message: string; cleanup?: ImportCleanupDisposition };
};

const countBy = (ledger: ImportLedgerEntry[], status: ImportLedgerStatus): number =>
  ledger.filter((entry) => entry.status === status).length;

/** One ordered line per top-level work: position, status, title, identifier, and — where it is
 *  meaningful — the stage the row stopped or is stopped at. An ONIX execution unit also says what
 *  it targets. */
const ledgerLine = (entry: ImportLedgerEntry): string => {
  const identifier = entry.reference ?? '(no identifier)';
  const stage = entry.stage ? ` — stage: ${STAGE_LABEL[entry.stage]}` : '';
  const unit = entry.unit ? ` — ${UNIT_LABEL[entry.unit]}` : '';

  return `${entry.position}. ${STATUS_LABEL[entry.status]}${unit} — ${entry.title || '(untitled)'} — ${identifier}${stage}`;
};

/**
 * What became of a stopped ONIX unit's own writes, and what may be done next (thoth-app#187): removed and proven
 * removed, never written, or not all proven removed - and so whether the complete file may be uploaded again or must be
 * reconciled by hand first.
 */
const cleanupLines = (cleanup: ImportCleanupDisposition): string[] => {
  const retry =
    'Retry: earlier units stay imported. Upload the complete file again: a fresh validation, planning and preflight plans only what is still missing. The stopped plan is never run again.';
  const removed =
    cleanup.status === 'NOT_REQUIRED'
      ? []
      : cleanup.compensated.map(
          ({ operation, entityId, stage }) =>
            `- Removed ${CLEANUP_OPERATION_LABEL[operation]} ${entityId} (${STAGE_LABEL[stage]})`,
        );

  switch (cleanup.status) {
    case 'NOT_REQUIRED':
      return ['Cleanup: not required. The stopped unit had not sent any change to Thoth.', retry];
    case 'VERIFIED':
      return [
        'Cleanup: verified. Everything the stopped unit wrote was removed again, each removal confirmed by the exact id it returned:',
        ...removed,
        'A contributor created for the stopped unit may remain as an unused record. This is expected, and it is not removed.',
        retry,
      ];
    default:
      return [
        'Cleanup: failed or unknown. What the stopped unit wrote could not all be proven removed.',
        ...removed,
        'Not proven removed:',
        ...cleanup.failures.map(
          ({ operation, entityId, actionKey, stage, reason }) =>
            `- ${CLEANUP_OPERATION_LABEL[operation]} ${entityId ?? '(id unknown)'} — ${STAGE_LABEL[stage]} — action ${actionKey || '(none)'}: ${reason}`,
        ),
        'Manual reconciliation required: do not upload the file again until these have been checked and resolved in Thoth.',
      ];
  }
};

export const buildImportReport = ({ source, timestamp, ledger, failure }: ImportReportInput): string => {
  const total = ledger.length;
  const completed = countBy(ledger, 'completed');
  const failed = countBy(ledger, 'failed');
  const notAttempted = countBy(ledger, 'notAttempted');
  const failedEntry = ledger.find((entry) => entry.status === 'failed');
  // An ONIX run is counted and reported in execution units (thoth-app#187); a CSV run in top-level books, as it always
  // was.
  const units = ledger.some((entry) => entry.unit !== undefined);

  const lines = [
    'Thoth bulk import report',
    `Generated: ${timestamp}`,
    `Import type: ${IMPORT_TYPE_LABEL[source.type]}`,
    `Source file: ${source.filename || '(unknown)'}`,
    `Result: ${failure ? 'Stopped' : 'Completed'}`,
    units ? `Execution units: ${total}` : `Top-level books: ${total}`,
    `Fully processed: ${completed}`,
    `Failed: ${failed}`,
    `Not attempted: ${notAttempted}`,
    '',
    units ? 'Per-unit results:' : 'Per-book results:',
    ...ledger.map(ledgerLine),
  ];

  if (failure) {
    lines.push('');

    if (failedEntry) {
      lines.push(
        `Stopped on ${units ? 'unit' : 'book'} ${failedEntry.position} of ${total}: ${failedEntry.title || '(untitled)'}`,
      );
    }

    if (failure.cleanup !== undefined) {
      // An ONIX run says the stage it failed at, then - apart from it - what became of the failed unit's own writes.
      lines.push(
        ...(failedEntry?.stage ? [`Failed stage: ${STAGE_LABEL[failedEntry.stage]}`] : []),
        `Error: ${failure.message}`,
        '',
        'Note: this import is not atomic across units. Earlier units stay imported; later units were not attempted.',
        ...cleanupLines(failure.cleanup),
      );
    } else {
      lines.push(
        `Error: ${failure.message}`,
        '',
        // The truthful account of a non-atomic run: the book it stopped on may already be partly
        // created, it was not rolled back, and running the same file again is not a safe retry.
        'Note: this import is not atomic. The book it stopped on may be partially created and was not rolled back.',
        'Re-running the same file is not a safe retry: open the Works list and resolve the partial import first.',
      );
    }
  }

  return lines.join('\n');
};

/**
 * A safe, predictable filename for the downloaded report, derived from the source file's name and
 * the terminal timestamp.
 *
 * The source name is reduced to its own basename with the extension dropped, then to a slug of
 * word characters, dots and dashes — so no directory separator, `..` traversal, or control
 * character from an unusual (but valid) upload name can reach the saved file. An empty or
 * all-stripped name falls back to `import`.
 */
export const importReportFilename = (source: ImportSource, timestamp: string): string => {
  const basename = source.filename.split(/[\\/]/).pop() ?? '';
  const withoutExtension = basename.replace(/\.[^.]+$/, '');
  const slug =
    withoutExtension
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '')
      .slice(0, 64) || 'import';

  const stamp = timestamp.replace(/[:.]/g, '-').replace(/[^0-9A-Za-z-]/g, '');

  return `${slug}-thoth-import-report-${stamp}.txt`;
};
