import { describe, expect, it } from 'vitest';

import type { ImportSource } from '@/src/shared/types';

import type { ImportLedgerEntry } from './importLedger';
import { buildImportReport, importReportFilename } from './importReport';

const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };
const timestamp = '2026-08-14T06:30:00.000Z';

const completedLedger: ImportLedgerEntry[] = [
  { position: 1, title: 'First Book', reference: '10.1/first', chapterCount: 0, status: 'completed' },
  { position: 2, title: 'Second Book', reference: 'REF-2', chapterCount: 2, status: 'completed' },
  { position: 3, title: 'Third Book', chapterCount: 0, status: 'completed' },
];

const failedLedger: ImportLedgerEntry[] = [
  { position: 1, title: 'First Book', reference: '10.1/first', chapterCount: 0, status: 'completed' },
  { position: 2, title: 'Second Book', reference: 'REF-2', chapterCount: 2, status: 'failed', stage: 'chapters' },
  { position: 3, title: 'Third Book', chapterCount: 0, status: 'notAttempted' },
];

describe('buildImportReport', () => {
  describe('successful run', () => {
    const report = buildImportReport({ source, timestamp, ledger: completedLedger });

    it('records source metadata, a completed result, and the correct totals', () => {
      expect(report).toContain(`Generated: ${timestamp}`);
      expect(report).toContain('Import type: ONIX');
      expect(report).toContain('Source file: catalogue.xml');
      expect(report).toContain('Result: Completed');
      expect(report).toContain('Top-level books: 3');
      expect(report).toContain('Fully processed: 3');
      expect(report).toContain('Failed: 0');
      expect(report).toContain('Not attempted: 0');
    });

    it('lists every top-level work in order, with its status and identifier', () => {
      expect(report).toContain('1. Completed — First Book — 10.1/first');
      expect(report).toContain('2. Completed — Second Book — REF-2');
      // A work with no DOI or reference is stated as such, never blank.
      expect(report).toContain('3. Completed — Third Book — (no identifier)');
    });

    it('labels a CSV source as CSV', () => {
      const csv = buildImportReport({ source: { type: 'csv', filename: 'books.csv' }, timestamp, ledger: completedLedger });
      expect(csv).toContain('Import type: CSV');
    });

    it('adds no failure section to a completed report', () => {
      expect(report).not.toMatch(/Error:/);
      expect(report).not.toMatch(/not atomic/i);
    });
  });

  describe('stopped run', () => {
    const report = buildImportReport({
      source,
      timestamp,
      ledger: failedLedger,
      failure: { message: 'Imprint "Unknown" not found' },
    });

    it('records a stopped result and the completed/failed/not-attempted counts', () => {
      expect(report).toContain('Result: Stopped');
      expect(report).toContain('Fully processed: 1');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('Not attempted: 1');
    });

    it('marks the row statuses and shows the failed row stage', () => {
      expect(report).toContain('1. Completed — First Book — 10.1/first');
      expect(report).toContain('2. Failed — Second Book — REF-2 — stage: Creating chapters');
      expect(report).toContain('3. Not attempted — Third Book — (no identifier)');
    });

    it('preserves the original error message and names the book it stopped on', () => {
      expect(report).toContain('Stopped on book 2 of 3: Second Book');
      expect(report).toContain('Error: Imprint "Unknown" not found');
    });

    it('keeps the partial / non-atomic / no-blind-retry warning without claiming a rollback', () => {
      expect(report).toContain('not atomic');
      expect(report).toMatch(/may be partially created/i);
      expect(report).toMatch(/not a safe retry/i);
      expect(report).toContain('was not rolled back');
      expect(report).not.toMatch(/was rolled back|has been rolled back/i);
    });

    it('omits stack traces, tokens and other runtime internals', () => {
      expect(report).not.toMatch(/\n\s+at\s/);
      expect(report.toLowerCase()).not.toContain('stack');
      expect(report.toLowerCase()).not.toContain('token');
      expect(report.toLowerCase()).not.toContain('authorization');
      expect(report.toLowerCase()).not.toContain('cookie');
    });
  });
});

describe('buildImportReport for an ONIX run (thoth-app#187)', () => {
  const unitLedger: ImportLedgerEntry[] = [
    { position: 1, title: 'A Book Thoth Holds', chapterCount: 0, unit: 'NOOP', status: 'completed' },
    {
      position: 2,
      title: 'An Existing Book',
      reference: '10.1/existing',
      chapterCount: 0,
      unit: 'EXISTING_WORK',
      status: 'failed',
      stage: 'award',
    },
    { position: 3, title: 'A New Book', chapterCount: 1, unit: 'NEW_WORK', status: 'notAttempted' },
  ];
  const report = (cleanup: NonNullable<Parameters<typeof buildImportReport>[0]['failure']>['cleanup']) =>
    buildImportReport({ source, timestamp, ledger: unitLedger, failure: { message: 'Award refused', cleanup } });

  it('counts and lists execution units, each saying what it targets, nothing-to-do units included', () => {
    const text = buildImportReport({
      source,
      timestamp,
      ledger: unitLedger.map((entry) => ({ ...entry, status: 'completed', stage: undefined })),
    });

    expect(text).toContain('Execution units: 3');
    expect(text).toContain('Per-unit results:');
    expect(text).toContain('1. Completed — Nothing to do (already in Thoth) — A Book Thoth Holds — (no identifier)');
    expect(text).toContain('2. Completed — Existing work — An Existing Book — 10.1/existing');
    expect(text).toContain('3. Completed — New work — A New Book — (no identifier)');
    expect(text).not.toContain('Top-level books');
  });

  it('keeps the failed stage apart from the cleanup, and says a fresh complete-file retry is allowed when none was needed', () => {
    const text = report({ status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' });

    expect(text).toContain('Stopped on unit 2 of 3: An Existing Book');
    expect(text).toContain('Failed stage: Creating awards');
    expect(text).toContain('Error: Award refused');
    expect(text).toContain('Cleanup: not required.');
    expect(text).toContain('Upload the complete file again');
    expect(text).not.toContain('Manual reconciliation required');
  });

  it('lists every removal it proved, accepts contributor residue, and allows a fresh complete-file retry', () => {
    const text = report({
      status: 'VERIFIED',
      retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
      compensated: [
        { operation: 'DELETE_ENDORSEMENT', entityId: 'endorsement-1', actionKey: 'a', stage: 'endorsement' },
        { operation: 'DELETE_PUBLICATION', entityId: 'publication-1', actionKey: 'b', stage: 'publication' },
      ],
    });

    expect(text).toContain('Cleanup: verified.');
    expect(text).toContain('- Removed Endorsement endorsement-1 (Creating endorsements)');
    expect(text).toContain('- Removed Publication publication-1 (Creating publications)');
    expect(text).toContain('A contributor created for the stopped unit may remain as an unused record');
    expect(text).toContain('Upload the complete file again');
    expect(text).not.toContain('Manual reconciliation required');
  });

  it('names what it could not prove removed, and requires manual reconciliation before any retry', () => {
    const text = report({
      status: 'FAILED_OR_UNKNOWN',
      retry: 'MANUAL_RECONCILIATION_REQUIRED',
      compensated: [
        { operation: 'DELETE_PUBLICATION', entityId: 'publication-1', actionKey: 'b', stage: 'publication' },
      ],
      failures: [
        {
          operation: 'CREATE_OUTCOME_UNKNOWN',
          entityId: null,
          actionKey: 'UNIT|g2|AWARD|i1',
          stage: 'award',
          reason: 'The creation request failed without returning an id',
        },
      ],
    });

    expect(text).toContain('Cleanup: failed or unknown.');
    expect(text).toContain('- Removed Publication publication-1 (Creating publications)');
    expect(text).toContain(
      '- Write whose outcome is unknown (id unknown) — Creating awards — action UNIT|g2|AWARD|i1: The creation request failed without returning an id',
    );
    expect(text).toContain('Manual reconciliation required');
    expect(text).not.toContain('Upload the complete file again');
  });
});

describe('importReportFilename', () => {
  it('builds a predictable name from a representative CSV filename', () => {
    expect(importReportFilename({ type: 'csv', filename: 'books.csv' }, timestamp)).toBe(
      'books-thoth-import-report-2026-08-14T06-30-00-000Z.txt',
    );
  });

  it('builds a predictable name from a representative ONIX/XML filename', () => {
    expect(importReportFilename({ type: 'onix', filename: 'catalogue.xml' }, timestamp)).toBe(
      'catalogue-thoth-import-report-2026-08-14T06-30-00-000Z.txt',
    );
  });

  it('slugs an unusual but valid source name safely', () => {
    expect(importReportFilename({ type: 'onix', filename: 'My Catalogue (2026).xml' }, timestamp)).toBe(
      'My-Catalogue-2026-thoth-import-report-2026-08-14T06-30-00-000Z.txt',
    );
  });

  it('cannot let path separators or traversal escape into the filename', () => {
    const name = importReportFilename({ type: 'onix', filename: '../../etc/passwd.xml' }, timestamp);

    expect(name).not.toContain('/');
    expect(name).not.toContain('\\');
    expect(name).not.toContain('..');
    expect(name).toBe('passwd-thoth-import-report-2026-08-14T06-30-00-000Z.txt');
  });

  it('falls back to a safe default when the source name has no usable characters', () => {
    expect(importReportFilename({ type: 'csv', filename: '.csv' }, timestamp)).toBe(
      'import-thoth-import-report-2026-08-14T06-30-00-000Z.txt',
    );
  });
});
