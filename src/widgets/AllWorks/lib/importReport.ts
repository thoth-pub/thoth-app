import type { ImportExecutionStage, ImportSource } from '@/src/shared/types';

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
  work: 'Creating the work',
  chapters: 'Creating chapters',
  series: 'Attaching series membership',
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
  /** Present only for a stopped run: the original, useful API/application error message. */
  failure?: { message: string };
};

const countBy = (ledger: ImportLedgerEntry[], status: ImportLedgerStatus): number =>
  ledger.filter((entry) => entry.status === status).length;

/** One ordered line per top-level work: position, status, title, identifier, and — where it is
 *  meaningful — the stage the row stopped or is stopped at. */
const ledgerLine = (entry: ImportLedgerEntry): string => {
  const identifier = entry.reference ?? '(no identifier)';
  const stage = entry.stage ? ` — stage: ${STAGE_LABEL[entry.stage]}` : '';

  return `${entry.position}. ${STATUS_LABEL[entry.status]} — ${entry.title || '(untitled)'} — ${identifier}${stage}`;
};

export const buildImportReport = ({ source, timestamp, ledger, failure }: ImportReportInput): string => {
  const total = ledger.length;
  const completed = countBy(ledger, 'completed');
  const failed = countBy(ledger, 'failed');
  const notAttempted = countBy(ledger, 'notAttempted');
  const failedEntry = ledger.find((entry) => entry.status === 'failed');

  const lines = [
    'Thoth bulk import report',
    `Generated: ${timestamp}`,
    `Import type: ${IMPORT_TYPE_LABEL[source.type]}`,
    `Source file: ${source.filename || '(unknown)'}`,
    `Result: ${failure ? 'Stopped' : 'Completed'}`,
    `Top-level books: ${total}`,
    `Fully processed: ${completed}`,
    `Failed: ${failed}`,
    `Not attempted: ${notAttempted}`,
    '',
    'Per-book results:',
    ...ledger.map(ledgerLine),
  ];

  if (failure) {
    lines.push('');

    if (failedEntry) {
      lines.push(`Stopped on book ${failedEntry.position} of ${total}: ${failedEntry.title || '(untitled)'}`);
    }

    lines.push(
      `Error: ${failure.message}`,
      '',
      // The truthful account of a non-atomic run: the book it stopped on may already be partly
      // created, it was not rolled back, and running the same file again is not a safe retry.
      'Note: this import is not atomic. The book it stopped on may be partially created and was not rolled back.',
      'Re-running the same file is not a safe retry: open the Works list and resolve the partial import first.',
    );
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
