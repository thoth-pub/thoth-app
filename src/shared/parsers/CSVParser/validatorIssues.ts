import type { RowError, ValidatorConfig } from 'csv-file-validator';

import type { ImportIssue, ImportIssueSource } from '../../types';

/**
 * Turns `csv-file-validator` findings into import issues with real source context.
 *
 * The library reports a row number, but not one number: it counts rows differently depending on
 * what went wrong, and a header problem has no data row at all. Reading that off the message
 * text is not an option — our messages are translated — so the mapping is made from the shape of
 * the finding, which is stable and observable.
 *
 * What `csv-file-validator@2.2.0` actually emits, for the config `getCsvConfig` builds (see
 * `_prepareDataAndValidateFile` and `_checkUniqueFields` in the library):
 *
 * | finding                     | shape                                 | row it means      |
 * | --------------------------- | ------------------------------------- | ----------------- |
 * | header name wrong/missing   | `{ rowIndex: 1, columnIndex, … }`     | the header row    |
 * | header count mismatch       | `{ … }` — no `rowIndex`               | the header row    |
 * | required cell empty         | `{ rowIndex, columnIndex, … }`        | `rowIndex - 1`    |
 * | cell fails its `validate`   | `{ rowIndex, columnIndex, … }`        | `rowIndex - 1`    |
 * | wrong number of fields      | `{ rowIndex, … }` — no `columnIndex`  | `rowIndex`        |
 *
 * The two numbering schemes are the library's own: cell findings count the header as row 1,
 * while the field-count finding counts data rows from 1. Both are normalised here to the
 * convention the rest of the importer uses — first data row is row 1 — so nothing downstream has
 * to know any of this.
 */

/**
 * One category is deliberately not mapped: a `unique` column's duplicate finding, which has the
 * same shape as a field-count mismatch (`rowIndex`, no `columnIndex`) but numbers its rows a
 * third way, from `file.data` rather than from the parsed CSV. Nothing in `getCsvConfig` sets
 * `unique`, so it cannot arise today; if one ever does, the two categories become
 * indistinguishable and guessing between them would be worse than saying nothing, so both fall
 * back to file level.
 */
const hasUniqueColumns = (config: ValidatorConfig): boolean => config.headers.some((header) => header.unique === true);

const FILE_SOURCE: ImportIssueSource = { kind: 'file' };

export const validatorIssueSource = (finding: RowError, config: ValidatorConfig): ImportIssueSource => {
  const { rowIndex, columnIndex } = finding;

  // A header count mismatch names no row at all.
  if (rowIndex === undefined) return FILE_SOURCE;

  if (columnIndex === undefined) {
    if (hasUniqueColumns(config)) return FILE_SOURCE;

    // A field-count mismatch, which the library numbers from the first data row already.
    return rowIndex >= 1 ? { kind: 'csv', row: rowIndex } : FILE_SOURCE;
  }

  // A cell finding, numbered with the header as row 1: row 1 is the header itself, and every
  // data row is one less than the number the library reports.
  const row = rowIndex - 1;

  return row >= 1 ? { kind: 'csv', row } : FILE_SOURCE;
};

/**
 * Every finding blocks the import, exactly as before: this changes where a problem is said to
 * be, never whether it stops the upload, and never the message the user reads.
 */
export const toValidatorIssues = (findings: RowError[], config: ValidatorConfig): ImportIssue[] =>
  findings.map(({ message, ...finding }) => ({
    severity: 'error',
    code: 'csv.validation',
    message,
    source: validatorIssueSource({ message, ...finding }, config),
  }));
