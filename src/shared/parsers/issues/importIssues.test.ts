import { describe, expect, it } from 'vitest';

import type {
  ImportIssue,
  ImportIssueSeverity,
  ImportIssueSource,
  OnixSourceDiagnostic,
} from '../../types';
import {
  blockingDiagnostics,
  errorIssues,
  importStatus,
  sortIssues,
  toImportIssues,
  warningIssues,
} from './importIssues';

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

describe('blockingDiagnostics', () => {
  const diagnostic = (overrides: Partial<OnixSourceDiagnostic> = {}): OnixSourceDiagnostic => ({
    classification: 'SOURCE_INVALID',
    severity: 'error',
    recovery: 'BLOCKING',
    code: 'onix.source.invalid_composite',
    message: 'message',
    path: 'ONIXMessage/Product[1]',
    ...overrides,
  });

  it('partitions on the carried recovery, not on the classification', () => {
    // Two findings that are equally source-invalid. Only the recovery an approved rule granted
    // decides whether the import may run, which is the whole point of carrying them separately.
    const recoverable = diagnostic({ severity: 'warning', recovery: 'OMIT_INVALID_COMPOSITE', message: 'omitted' });
    const blocking = diagnostic({ message: 'blocked' });

    expect(blockingDiagnostics([recoverable, blocking]).map(({ message }) => message)).toEqual(['blocked']);
  });

  it('does not block on a valid fact the target cannot represent', () => {
    const loss = diagnostic({ classification: 'TARGET_UNREPRESENTABLE', severity: 'warning', recovery: 'NONE' });

    expect(blockingDiagnostics([loss])).toEqual([]);
  });
});

describe('toImportIssues', () => {
  const diagnostic = (overrides: Partial<OnixSourceDiagnostic> = {}): OnixSourceDiagnostic => ({
    classification: 'SOURCE_INVALID',
    severity: 'error',
    recovery: 'BLOCKING',
    code: 'onix.source.invalid_composite',
    message: 'message',
    path: 'ONIXMessage/Product[1]/CollateralDetail/TextContent[2]',
    productIndex: 1,
    ...overrides,
  });

  it('carries the exact source path onto the issue the user is shown', () => {
    expect(toImportIssues([diagnostic({ recordReference: 'REF-1' })])).toEqual([
      {
        severity: 'error',
        code: 'onix.source.invalid_composite',
        message: 'message',
        source: {
          kind: 'onix',
          productIndex: 1,
          recordReference: 'REF-1',
          sourcePath: 'ONIXMessage/Product[1]/CollateralDetail/TextContent[2]',
        },
      },
    ]);
  });

  it('reports a message-level finding against the file rather than inventing a product 0', () => {
    const release = diagnostic({ code: 'onix.source.undeclared_release', path: 'ONIXMessage', productIndex: undefined });

    expect(toImportIssues([release])).toEqual([
      { severity: 'error', code: 'onix.source.undeclared_release', message: 'message', source: { kind: 'file' } },
    ]);
  });

  it('keeps informational provenance out of what the user is asked to read', () => {
    // An accepted spelling that was canonicalised is not something to act on. It stays on the
    // diagnostic for later reporting rather than becoming an issue in the upload screen.
    const info = diagnostic({
      classification: 'SUPPORTED_NORMALIZED',
      severity: 'info',
      recovery: 'NONE',
      code: 'onix.source.normalised_identifier',
    });

    expect(toImportIssues([info])).toEqual([]);
  });

  it('turns a recoverable source-invalid finding into a warning, so the import still runs', () => {
    const recoverable = diagnostic({ severity: 'warning', recovery: 'OMIT_INVALID_COMPOSITE' });

    expect(importStatus(toImportIssues([recoverable]))).toBe('success');
    expect(importStatus(toImportIssues([diagnostic()]))).toBe('failed');
  });
});
