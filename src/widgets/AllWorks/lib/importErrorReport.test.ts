import { describe, expect, it } from 'vitest';

import type { ImportExecutionFailure, ImportSource } from '@/src/shared/types';

import { buildImportErrorReport } from './importErrorReport';

describe('buildImportErrorReport', () => {
  const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };
  const timestamp = '2026-08-14T06:30:00.000Z';

  const failure: ImportExecutionFailure = {
    total: 48,
    completed: 11,
    current: { position: 12, title: 'The Middle Book', reference: '10.5555/mid', chapterCount: 3 },
    stage: 'chapters',
    message: 'Imprint "Unknown" not found',
  };

  const report = (overrides: { source?: ImportSource; failure?: Partial<ImportExecutionFailure> } = {}) =>
    buildImportErrorReport({
      source: overrides.source ?? source,
      failure: { ...failure, ...overrides.failure },
      timestamp,
    });

  it('records the source, the execution context and the original error message', () => {
    const output = report();

    expect(output).toContain('Import type: ONIX');
    expect(output).toContain('Source file: catalogue.xml');
    expect(output).toContain(`Generated: ${timestamp}`);
    expect(output).toContain('Stopped at: book 12 of 48');
    expect(output).toContain('Book title: The Middle Book');
    expect(output).toContain('Identifier: 10.5555/mid');
    expect(output).toContain('Stage: Creating chapters');
    expect(output).toContain('Books fully processed before the failure: 11');
    expect(output).toContain('Books not started: 36');
    expect(output).toContain('Error: Imprint "Unknown" not found');
  });

  it('labels a CSV source as CSV', () => {
    expect(report({ source: { type: 'csv', filename: 'books.csv' } })).toContain('Import type: CSV');
  });

  it('says the failing book may be partial and is not a safe retry, without claiming a rollback', () => {
    const output = report();

    expect(output).toContain('not atomic');
    expect(output).toMatch(/may be partially created/i);
    expect(output).toMatch(/not a safe retry/i);
    // The only mention of a rollback is the truthful negation; there is no positive claim.
    expect(output).toContain('not rolled back');
    expect(output).not.toMatch(/was rolled back|has been rolled back/i);
  });

  it('omits stack traces and other runtime internals', () => {
    const output = report();

    // No JavaScript stack frames, and none of the words a leaked internal would bring with it.
    expect(output).not.toMatch(/\n\s+at\s/);
    expect(output.toLowerCase()).not.toContain('stack');
    expect(output.toLowerCase()).not.toContain('token');
    expect(output.toLowerCase()).not.toContain('authorization');
  });

  it('shows a placeholder when the work carries no identifier', () => {
    expect(report({ failure: { current: { position: 1, title: 'No Id', chapterCount: 0 } } })).toContain(
      'Identifier: (none)',
    );
  });
});
