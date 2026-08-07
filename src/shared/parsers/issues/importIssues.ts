import type { ImportIssue, ImportIssueSource, ImportParseResult } from '../../types';

/**
 * The rules that turn a pile of issues into an ordered, actionable list and into a parse status.
 *
 * They live here rather than in each parser so that CSV and ONIX cannot drift apart on the two
 * things a user notices: whether a file was accepted, and the order the findings are read in.
 */

/**
 * Where an issue's source sits in the uploaded file.
 *
 * A file-level problem is about the upload as a whole rather than any record inside it, so it
 * sorts ahead of everything. That is a position, not a synthetic record: no CSV row 0 and no
 * ONIX product 0 is ever invented, and in practice the two never compete, because a file that
 * fails as a whole is never parsed row by row.
 */
const sourcePosition = (source: ImportIssueSource): number => {
  switch (source.kind) {
    case 'csv':
      return source.row;
    case 'onix':
      return source.productIndex;
    case 'file':
      return 0;
  }
};

/**
 * Issues in source-file order, then in the order they were raised within one record.
 *
 * Deliberately blind to severity: a warning on row 2 is read before an error on row 3, because
 * the user is reading their file, not a severity report. Sorting is on a captured emission index
 * rather than relying on `Array.prototype.sort` stability, so rows and products that are parsed
 * concurrently cannot have their findings reordered by which lookup finished first.
 */
export const sortIssues = (issues: ImportIssue[]): ImportIssue[] =>
  issues
    .map((issue, order) => ({ issue, order }))
    .sort((a, b) => sourcePosition(a.issue.source) - sourcePosition(b.issue.source) || a.order - b.order)
    .map(({ issue }) => issue);

export const errorIssues = (issues: ImportIssue[]): ImportIssue[] =>
  issues.filter(({ severity }) => severity === 'error');

export const warningIssues = (issues: ImportIssue[]): ImportIssue[] =>
  issues.filter(({ severity }) => severity === 'warning');

/**
 * A parse failed exactly when something in it was an error. Warnings never fail a parse — that
 * is the whole point of having them.
 */
export const importStatus = (issues: ImportIssue[]): ImportParseResult<unknown>['status'] =>
  issues.some(({ severity }) => severity === 'error') ? 'failed' : 'success';
