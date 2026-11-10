import { describe, expect, it } from 'vitest';

import type { OnixHeldBackGroup } from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import type { ImportSource } from '@/src/shared/types';

import type { ImportLedgerEntry } from './importLedger';
import { buildImportReport, importReportFilename, isHeldBackFix, publisherFixesOf } from './importReport';

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

/**
 * APP-CSV-D11-A (thoth-app#281): a CSV plan refused before execution. The report says so in its own result, with every
 * published-status entry, and carries none of a stopped run's partial-import, rollback, cleanup or retry wording.
 */
describe('buildImportReport for a CSV plan refused before execution (APP-CSV-D11-A)', () => {
  const csvSource: ImportSource = { type: 'csv', filename: 'books.csv' };
  const rejectedLedger: ImportLedgerEntry[] = [
    { position: 1, title: 'First Book', reference: '10.1/first', chapterCount: 0, status: 'notAttempted' },
    { position: 2, title: 'Second Book', reference: 'REF-2', chapterCount: 2, status: 'rejected' },
    { position: 3, title: 'Third Book', chapterCount: 0, status: 'rejected' },
  ];
  const rejection = {
    message:
      'CSV bulk import refused before execution because the plan contains published-status Works (3 violations), so nothing was created.',
    violations: [
      { entity: 'work' as const, position: 2, status: 'ACTIVE', title: 'Second Book', reference: 'REF-2' },
      { entity: 'chapter' as const, position: 4, status: 'SUPERSEDED', title: 'Chapter D', parentPosition: 3 },
      { entity: 'chapter' as const, position: 5, status: 'WITHDRAWN', title: 'Stray', parentPosition: null },
    ],
  };
  const report = buildImportReport({ source: csvSource, timestamp, ledger: rejectedLedger, rejection });

  it('records a rejected-before-execution result, with zero processed, failed or sent', () => {
    expect(report).toContain('Result: Rejected before execution');
    expect(report).toContain('Top-level books: 3');
    expect(report).toContain('Fully processed: 0');
    expect(report).toContain('Failed: 0');
    expect(report).toContain('Not attempted: 1');
    expect(report).toContain('Rejected: 2');
    expect(report).toContain('Mutations issued: 0.');
    expect(report).toContain('no cleanup was required');
  });

  it('agrees with the ledger row by row', () => {
    expect(report).toContain('1. Not attempted — First Book — 10.1/first');
    expect(report).toContain('2. Rejected — Second Book — REF-2');
    expect(report).toContain('3. Rejected — Third Book — (no identifier)');
    expect(report).not.toMatch(/stage:/);
  });

  it('names every published-status entry by its position and canonical status', () => {
    expect(report).toContain('- Book 2 of 3: ACTIVE — Second Book — REF-2');
    expect(report).toContain('- Chapter 4 (of book 3): SUPERSEDED — Chapter D — (no identifier)');
    expect(report).toContain('- Chapter 5 (of no book in the plan): WITHDRAWN — Stray — (no identifier)');
    expect(report).toContain(`Message: ${rejection.message}`);
  });

  it('carries no stopped-run, partial-import, rollback, ONIX cleanup or retry wording', () => {
    expect(report).not.toContain('Result: Stopped');
    expect(report).not.toContain('Result: Completed');
    expect(report).not.toMatch(/Stopped on/);
    expect(report).not.toMatch(/Error:/);
    expect(report).not.toMatch(/not atomic/i);
    expect(report).not.toMatch(/partially created/i);
    expect(report).not.toMatch(/rolled back/i);
    expect(report).not.toMatch(/Cleanup:/);
    expect(report).not.toMatch(/Retry/);
    expect(report).not.toMatch(/reconciliation/i);
  });

  it('ignores a failure passed beside it: a refusal is never also a stopped run', () => {
    expect(
      buildImportReport({ source: csvSource, timestamp, ledger: rejectedLedger, rejection, failure: { message: 'x' } }),
    ).toBe(report);
  });

  it('leaves every other report without a Rejected count', () => {
    expect(buildImportReport({ source, timestamp, ledger: completedLedger })).not.toMatch(/Rejected/);
    expect(buildImportReport({ source, timestamp, ledger: failedLedger, failure: { message: 'm' } })).not.toMatch(
      /Rejected/,
    );
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

  it('never reads a create whose outcome is unknown as removed or verified, even with nothing else to report (thoth-app#250)', () => {
    const text = report({
      status: 'FAILED_OR_UNKNOWN',
      retry: 'MANUAL_RECONCILIATION_REQUIRED',
      compensated: [],
      failures: [
        {
          operation: 'CREATE_OUTCOME_UNKNOWN',
          entityId: null,
          actionKey: 'UNIT|g2|PUBLICATION|p2',
          stage: 'publication',
          reason: 'The Publication creation request failed without returning an id',
        },
      ],
    });

    expect(text).toContain('Cleanup: failed or unknown.');
    expect(text).toContain('Not proven removed:');
    expect(text).not.toContain('Cleanup: verified');
    expect(text).not.toContain('- Removed');
    expect(text).not.toContain('Upload the complete file again');
    expect(text).toContain('Manual reconciliation required');
  });

  it.each([
    { status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' },
    { status: 'VERIFIED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT', compensated: [] },
    { status: 'FAILED_OR_UNKNOWN', retry: 'MANUAL_RECONCILIATION_REQUIRED', compensated: [], failures: [] },
  ] as const)(
    'never claims file-level atomicity or a rollback when the cleanup is $status (thoth-app#250)',
    (cleanup) => {
      const text = report(cleanup);
      const rest = text.replace('this import is not atomic across units', '');

      // The run is non-atomic across units, and says so; earlier units stay imported whatever the cleanup proved.
      expect(text).toContain('Note: this import is not atomic across units. Earlier units stay imported');
      expect(rest).not.toMatch(/\batomic\b/i);
      expect(rest).not.toMatch(/roll(ed)?\s?back/i);
    },
  );
});

describe('buildImportReport for an ONIX partial import (thoth-app#282)', () => {
  const ledger: ImportLedgerEntry[] = [
    { position: 1, title: 'A Clean Book', chapterCount: 0, unit: 'NEW_WORK', status: 'completed' },
  ];
  const finding = {
    id: '_20171221_e_1',
    tier: 'STRICT',
    stage: 6,
    scope: 'VALIDITY',
    class: 'NORMATIVE_INVALID',
    blocking: true,
    projection: 'AUTHORITATIVE',
    recoverability: 'NOT_RECOVERABLE',
    counts: true,
    path: '/ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]',
    sourcePath: '/ONIXMessage[1]/product[2]/collateraldetail[1]/textcontent[1]',
    message: 'A short description must not be longer than 350 characters',
  } as const;
  const heldBack = [
    {
      groupKey: 'work:product:gtin13:9781802820010',
      productKeys: ['product:gtin13:9781802820010'],
      records: [{ recordKey: 'record:2', index: 2, recordReference: 'rp.held', isbn: '9781802820010' }],
      title: 'A Held-Back Book',
      isbns: ['9781802820010'],
      findings: [finding],
    },
  ];

  it('lists every held-back book by title and ISBN, with its findings, as not imported', () => {
    const text = buildImportReport({ source, timestamp, ledger, heldBack });

    expect(text).toContain('Held back, not imported: 1 book');
    expect(text).toContain('Nothing was created, changed or deleted for them.');
    expect(text).toContain('- A Held-Back Book — ISBN: 9781802820010 — not imported');
    expect(text).toContain('  Products in the file: 2 (rp.held)');
    expect(text).toContain(
      `  Finding _20171221_e_1: A short description must not be longer than 350 characters at ${finding.sourcePath}`,
    );
    // The held-back book is never one of the run's units or results.
    expect(text).toContain('Execution units: 1');
    expect(text).toContain('Result: Completed');
  });

  it('leaves the report of an import of the whole file exactly as it was', () => {
    expect(buildImportReport({ source, timestamp, ledger, heldBack: [] })).toBe(
      buildImportReport({ source, timestamp, ledger }),
    );
    expect(buildImportReport({ source, timestamp, ledger })).not.toContain('Held back');
  });
});

describe('buildImportReport with publisher fixes (thoth-app#283)', () => {
  const ledger: ImportLedgerEntry[] = [
    { position: 1, title: 'A Fixed Book', chapterCount: 0, unit: 'NEW_WORK', status: 'completed' },
  ];
  const edition = {
    recovery: 'PUBLISHER_SUPPLIED_VALUE',
    rule: 'R-EDITION-STATEMENT',
    decision: 'PUBLISHER',
    action: 'SET_EDITION_NUMBER',
    path: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
    sourcePath: '/ONIXmessage[1]/product[1]/descriptivedetail[1]',
    valuePath: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/EditionNumber[1]',
    original: null,
    value: '3',
    originalTextFormat: null,
    valueTextFormat: null,
  } as const;
  const description = {
    ...edition,
    rule: '_20171221_e_1',
    action: 'REPLACE_SHORT_DESCRIPTION',
    path: '/ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]',
    sourcePath: null,
    valuePath: '/ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]/Text[1]',
    original: '<p>A long description</p>\n<p>over two lines</p>',
    value: '<p>A short one.</p>',
    originalTextFormat: '05',
    valueTextFormat: '02',
  } as const;
  const omitted = { ...description, action: 'OMIT_SHORT_DESCRIPTION', value: null, valueTextFormat: null } as const;

  it('lists every publisher fix: rule, location, the file value and the imported value, and any format change', () => {
    const text = buildImportReport({ source, timestamp, ledger, publisherFixes: [edition, description, omitted] });

    expect(text).toContain('Corrected by the publisher in the import review: 3 fixes');
    expect(text).toContain(
      [
        '- Rule R-EDITION-STATEMENT at /ONIXmessage[1]/product[1]/descriptivedetail[1]',
        '  In the file: not stated',
        '  Imported: 3',
        '  Publisher decision; the submitted file is unchanged.',
        '- Rule _20171221_e_1 at /ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]',
        '  In the file: <p>A long description</p>',
        '    <p>over two lines</p>',
        '  Imported: <p>A short one.</p>',
        '  Text format: 05 → 02',
        '  Publisher decision; the submitted file is unchanged.',
        '- Rule _20171221_e_1 at /ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]',
        '  In the file: <p>A long description</p>',
        '    <p>over two lines</p>',
        '  Imported: left out',
        '  Publisher decision; the submitted file is unchanged.',
      ].join('\n'),
    );
  });

  describe('a fix on a book the plan held back (review B1)', () => {
    const heldBackBook = (finding: { id: string; message: string; recoverability: string; counts: boolean }) =>
      [
        {
          groupKey: 'work:product:gtin13:9780000000002',
          productKeys: ['product:gtin13:9780000000002'],
          records: [{ recordKey: 'record:2', index: 2, recordReference: 'fix.held', isbn: '9780000000002' }],
          title: 'A Held-Back Book',
          isbns: ['9780000000002'],
          findings: [
            {
              ...finding,
              tier: 'INVENTORY',
              stage: 8,
              scope: 'VALIDITY',
              class: 'NORMATIVE_INVALID',
              blocking: true,
              projection: 'AUTHORITATIVE',
              path: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]',
              sourcePath: null,
            },
          ],
        },
      ] as unknown as readonly OnixHeldBackGroup[];
    const heldEdition = {
      ...edition,
      path: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]',
      sourcePath: null,
      valuePath: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]/EditionNumber[1]',
    } as const;
    const unfixable = {
      id: 'R-LANGUAGE-ROLE',
      message: 'LanguageRole 01 and 02 carry the same LanguageCode',
      recoverability: 'NOT_RECOVERABLE',
      counts: true,
    };
    // Fixed, then skipped while its short description still held it back.
    const unfixed = {
      id: '_20171221_e_1',
      message: 'A short description must not be longer than 350',
      recoverability: 'NOT_RECOVERABLE',
      counts: true,
    };

    it.each([
      ['another finding no fix exists for', unfixable],
      ['a finding left unfixed when the publisher skipped it after the fix', unfixed],
    ])('never says it was imported when the book was held back by %s', (_, finding) => {
      const heldBack = heldBackBook(finding);
      const text = buildImportReport({ source, timestamp, ledger, heldBack, publisherFixes: [edition, heldEdition] });

      expect(text).toContain('- A Held-Back Book — ISBN: 9780000000002 — not imported');
      expect(text).toContain('Corrected by the publisher in the import review: 2 fixes');
      // The fix on the imported book reads as before; the one on the held-back book never as imported.
      expect(text).toContain(
        [
          '- Rule R-EDITION-STATEMENT at /ONIXmessage[1]/product[1]/descriptivedetail[1]',
          '  In the file: not stated',
          '  Imported: 3',
          '  Publisher decision; the submitted file is unchanged.',
          '- Rule R-EDITION-STATEMENT at /ONIXMessage[1]/Product[2]/DescriptiveDetail[1]',
          '  In the file: not stated',
          "  Publisher's value: 3",
          '  Not imported: this book was held back, so this fix was not used.',
          '  Publisher decision; the submitted file is unchanged.',
        ].join('\n'),
      );
      expect(text.match(/ {2}Imported: /g)).toHaveLength(1);
      expect(isHeldBackFix(heldEdition, heldBack)).toBe(true);
      expect(isHeldBackFix(edition, heldBack)).toBe(false);
    });

    it('states a held-back omission and format change as the publisher supplied them, not as imported', () => {
      const heldBack = heldBackBook(unfixable);
      const text = buildImportReport({
        source,
        timestamp,
        ledger,
        heldBack,
        publisherFixes: [
          { ...description, path: heldEdition.path },
          { ...omitted, path: heldEdition.path },
        ],
      });

      expect(text).toContain(
        [
          "  Publisher's value: <p>A short one.</p>",
          '  Text format: 05 → 02',
          '  Not imported: this book was held back, so this fix was not used.',
        ].join('\n'),
      );
      expect(text).toContain(
        [
          "  Publisher's value: leave it out",
          '  Not imported: this book was held back, so this fix was not used.',
        ].join('\n'),
      );
      expect(text).not.toContain('  Imported: ');
    });
  });

  it('leaves the report exactly as it was when nothing was fixed', () => {
    expect(buildImportReport({ source, timestamp, ledger, publisherFixes: [] })).toBe(
      buildImportReport({ source, timestamp, ledger }),
    );
    expect(buildImportReport({ source, timestamp, ledger })).not.toContain('Corrected by the publisher');
  });

  it("reads the fixes from an ONIX plan's issues, and nothing else", () => {
    const recovered = (recovery: typeof edition | typeof description) => ({
      severity: 'warning' as const,
      code: 'onix.source.recovered' as const,
      message: 'recovered',
      source: { kind: 'file' as const },
      sourceValidation: { kind: 'recovery' as const, recovery },
    });
    expect(
      publisherFixesOf([
        recovered(edition),
        { severity: 'warning', code: 'onix.source.recovered', message: 'other', source: { kind: 'file' } },
        recovered(description),
      ]),
    ).toEqual([edition, description]);
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
