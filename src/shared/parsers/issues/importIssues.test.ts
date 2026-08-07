import { describe, expect, it } from 'vitest';

import type { ImportIssue, ImportIssueSeverity, ImportIssueSource } from '../../types';
import { errorIssues, importStatus, sortIssues, warningIssues } from './importIssues';

const issue = (severity: ImportIssueSeverity, source: ImportIssueSource, message = 'message'): ImportIssue => ({
  severity,
  code: severity === 'error' ? 'csv.validation' : 'onix.series.non_publisher_collection_skipped',
  message,
  source,
});

const csvRow = (row: number) => ({ kind: 'csv', row }) as const;
const onixProduct = (productIndex: number) => ({ kind: 'onix', productIndex }) as const;

const messagesOf = (issues: ImportIssue[]) => issues.map(({ message }) => message);

describe('importStatus', () => {
  it('is success when nothing was reported', () => {
    expect(importStatus([])).toBe('success');
  });

  it('is success when only warnings were reported', () => {
    expect(importStatus([issue('warning', csvRow(1)), issue('warning', onixProduct(2))])).toBe('success');
  });

  it('is failed as soon as one issue is an error, whatever else it sits with', () => {
    expect(importStatus([issue('warning', csvRow(1)), issue('error', csvRow(2))])).toBe('failed');
    expect(importStatus([issue('error', { kind: 'file' })])).toBe('failed');
  });
});

describe('errorIssues and warningIssues', () => {
  it('partition on the carried severity, not on the wording', () => {
    const issues = [issue('warning', csvRow(1), 'error-sounding warning'), issue('error', csvRow(2), 'polite error')];

    expect(messagesOf(errorIssues(issues))).toEqual(['polite error']);
    expect(messagesOf(warningIssues(issues))).toEqual(['error-sounding warning']);
  });
});

describe('sortIssues', () => {
  it('orders CSV issues by row and ONIX issues by product index', () => {
    const csv = sortIssues([issue('error', csvRow(3), 'row 3'), issue('error', csvRow(1), 'row 1')]);
    const onix = sortIssues([issue('error', onixProduct(4), 'product 4'), issue('error', onixProduct(2), 'product 2')]);

    expect(messagesOf(csv)).toEqual(['row 1', 'row 3']);
    expect(messagesOf(onix)).toEqual(['product 2', 'product 4']);
  });

  it('never lets severity disturb source order', () => {
    const sorted = sortIssues([
      issue('warning', csvRow(4), 'row 4 warning'),
      issue('error', csvRow(3), 'row 3 error'),
      issue('warning', csvRow(2), 'row 2 warning'),
    ]);

    expect(messagesOf(sorted)).toEqual(['row 2 warning', 'row 3 error', 'row 4 warning']);
  });

  it('keeps the order issues were raised in within one source record', () => {
    const sorted = sortIssues([
      issue('error', csvRow(2), 'second'),
      issue('error', csvRow(1), 'first'),
      issue('error', csvRow(2), 'third'),
    ]);

    expect(messagesOf(sorted)).toEqual(['first', 'second', 'third']);
  });

  it('puts a problem with the whole file ahead of any record in it', () => {
    const sorted = sortIssues([issue('error', csvRow(1), 'row 1'), issue('error', { kind: 'file' }, 'file')]);

    expect(messagesOf(sorted)).toEqual(['file', 'row 1']);
  });

  it('preserves the source context it was given', () => {
    const [sorted] = sortIssues([issue('warning', { kind: 'onix', productIndex: 2, recordReference: '978' })]);

    expect(sorted.source).toEqual({ kind: 'onix', productIndex: 2, recordReference: '978' });
  });

  it('does not mutate the issues it was given', () => {
    const issues = [issue('error', csvRow(3), 'row 3'), issue('error', csvRow(1), 'row 1')];

    sortIssues(issues);

    expect(messagesOf(issues)).toEqual(['row 3', 'row 1']);
  });
});
