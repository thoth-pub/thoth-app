import type { ImportExecutionFailure, ImportExecutionStage, ImportSource } from '@/src/shared/types';

/**
 * Builds the plain-text diagnostic a publisher can copy and send to Thoth support.
 *
 * It is assembled from what the modal already holds — the source file, the execution context of
 * the failure, and the useful error message the API produced. It carries no stack trace, no
 * tokens, no headers: only the facts a developer needs to find the failing book. The wording is
 * fixed English on purpose, so a report reaching support reads the same whatever locale the
 * publisher runs the app in.
 */

export type ImportErrorReportInput = {
  source: ImportSource;
  failure: ImportExecutionFailure;
  /** ISO timestamp of when the failure occurred. */
  timestamp: string;
};

const IMPORT_TYPE_LABEL: Record<ImportSource['type'], string> = {
  csv: 'CSV',
  onix: 'ONIX',
};

const STAGE_LABEL: Record<ImportExecutionStage, string> = {
  work: 'Creating the work',
  chapters: 'Creating chapters',
  series: 'Attaching series membership',
};

export const importStageLabelText = (stage: ImportExecutionStage): string => STAGE_LABEL[stage];

export const buildImportErrorReport = ({ source, failure, timestamp }: ImportErrorReportInput): string => {
  const { total, completed, current, stage, message } = failure;
  const notStarted = Math.max(total - current.position, 0);

  const lines = [
    'Thoth bulk import — error report',
    `Generated: ${timestamp}`,
    `Import type: ${IMPORT_TYPE_LABEL[source.type]}`,
    `Source file: ${source.filename || '(unknown)'}`,
    `Stopped at: book ${current.position} of ${total}`,
    `Book title: ${current.title || '(untitled)'}`,
    `Identifier: ${current.reference ?? '(none)'}`,
    `Stage: ${STAGE_LABEL[stage]}`,
    `Books fully processed before the failure: ${completed}`,
    `Books not started: ${notStarted}`,
    `Error: ${message}`,
    '',
    'Note: this import is not atomic. The book above may be partially created and was not rolled back.',
    'Re-running the same file is not a safe retry: check the Works list and resolve the partial import first.',
  ];

  return lines.join('\n');
};
