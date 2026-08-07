import type { RowError, ValidatorConfig } from 'csv-file-validator';
import { describe, expect, it } from 'vitest';

import { toValidatorIssues, validatorIssueSource } from './validatorIssues';

/**
 * The findings below are the shapes `csv-file-validator@2.2.0` genuinely emits — taken from its
 * `_prepareDataAndValidateFile` and `_checkUniqueFields`, and confirmed against the real library
 * by the end-to-end cases in `CSVParser.test.ts`. They are reproduced here so the mapping can be
 * exercised category by category, including the ones our config cannot currently produce.
 */

const config = (headers: ValidatorConfig['headers'] = []): ValidatorConfig => ({ headers });

const headerNameError: RowError = {
  rowIndex: 1,
  columnIndex: 4,
  message: 'Header name titel is not correct or missing in the 1 row / 4 column',
};

const headerCountError: RowError = { message: 'Header name edition is not correct or missing' };

const cellError = (rowIndex: number): RowError => ({ rowIndex, columnIndex: 3, message: 'not valid' });

const fieldCountError = (rowIndex: number): RowError => ({ rowIndex, message: 'Number of fields mismatch' });

describe('validatorIssueSource', () => {
  it('files a header name problem against the file, not against data row 1', () => {
    // The library counts the header as row 1, so its cell findings are one higher than our rows.
    expect(validatorIssueSource(headerNameError, config())).toEqual({ kind: 'file' });
  });

  it('files a header count problem, which names no row at all, against the file', () => {
    expect(validatorIssueSource(headerCountError, config())).toEqual({ kind: 'file' });
  });

  it('maps a cell finding onto the data row it belongs to', () => {
    expect(validatorIssueSource(cellError(2), config())).toEqual({ kind: 'csv', row: 1 });
    expect(validatorIssueSource(cellError(4), config())).toEqual({ kind: 'csv', row: 3 });
  });

  it('maps a field-count finding, which the library numbers differently, onto the same rows', () => {
    // A short row 2 and a bad cell in row 2 are reported as rowIndex 2 and rowIndex 3 by the
    // library. Both mean data row 2.
    expect(validatorIssueSource(fieldCountError(2), config())).toEqual({ kind: 'csv', row: 2 });
    expect(validatorIssueSource(cellError(3), config())).toEqual({ kind: 'csv', row: 2 });
  });

  it('falls back to the file rather than guessing when a unique column could be involved', () => {
    // A duplicate in a `unique` column has the same shape as a field-count mismatch but numbers
    // its rows from the accepted data instead. Nothing in getCsvConfig sets `unique`, so this is
    // unreachable today; if it ever is set, the two are indistinguishable and neither is claimed.
    const withUnique = config([{ name: 'doi', inputName: 'doi', unique: true }]);

    expect(validatorIssueSource(fieldCountError(2), withUnique)).toEqual({ kind: 'file' });
    // Cell findings are still unambiguous, so they keep their row.
    expect(validatorIssueSource(cellError(2), withUnique)).toEqual({ kind: 'csv', row: 1 });
  });
});

describe('toValidatorIssues', () => {
  it('keeps every message and blocks exactly as before', () => {
    const issues = toValidatorIssues([headerCountError, cellError(2)], config());

    expect(issues.map(({ message }) => message)).toEqual([headerCountError.message, 'not valid']);
    expect(issues.every(({ severity, code }) => severity === 'error' && code === 'csv.validation')).toBe(true);
  });
});
