import { describe, expect, it } from 'vitest';

import { WorkStatus } from '@/gql/graphql';

import {
  checkCsvWorkLifecycle,
  type CsvLifecycleDate,
  type CsvLifecycleProblem,
  isCsvPdfLocationFilled,
  isNamedCsvContributor,
} from './csvBackendParity';
import { csvWorkTypeKind, readCsvPrice, readCsvWholeNumber, refusedThemaCodes, THOTH_URL_PATTERN } from './csvPreflight';

/**
 * The pure functions of APP-IMPORT-CSV-PARITY-01 (thoth-app#320). The rules themselves are tested through the real
 * parser in `csvPreflight.test.ts`.
 */

describe('checkCsvWorkLifecycle (P-1)', () => {
  const PUBLISHED = '2026-07-22';
  const BEFORE = '2026-07-21';
  const AFTER = '2026-07-23';

  /** Each status's expected case for: no dates; publication only; withdrawn only; and withdrawn before, equal to, after. */
  type Expected = readonly [
    none: CsvLifecycleProblem | undefined,
    publicationOnly: CsvLifecycleProblem | undefined,
    withdrawnOnly: CsvLifecycleProblem | undefined,
    before: CsvLifecycleProblem | undefined,
    equal: CsvLifecycleProblem | undefined,
    after: CsvLifecycleProblem | undefined,
  ];

  const notAllowed = 'withdrawnDateNotAllowed';
  const unpublished: Expected = [undefined, undefined, notAllowed, notAllowed, notAllowed, notAllowed];
  const outOfPrint: Expected = [
    'publicationDateRequired',
    'withdrawnDateRequired',
    'publicationDateRequired',
    'withdrawnDateNotAfterPublication',
    'withdrawnDateNotAfterPublication',
    undefined,
  ];

  const EXPECTED: Record<WorkStatus, Expected> = {
    [WorkStatus.Forthcoming]: unpublished,
    [WorkStatus.PostponedIndefinitely]: unpublished,
    [WorkStatus.Cancelled]: unpublished,
    [WorkStatus.Active]: ['publicationDateRequired', undefined, 'publicationDateRequired', notAllowed, notAllowed, notAllowed],
    [WorkStatus.Withdrawn]: outOfPrint,
    [WorkStatus.Superseded]: outOfPrint,
  };

  const DATES: readonly (readonly [CsvLifecycleDate, CsvLifecycleDate])[] = [
    [null, null],
    [PUBLISHED, null],
    [null, PUBLISHED],
    [PUBLISHED, BEFORE],
    [PUBLISHED, PUBLISHED],
    [PUBLISHED, AFTER],
  ];

  it('covers every WorkStatus', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.values(WorkStatus).sort());
  });

  it.each(Object.values(WorkStatus))('returns WorkProperties::validate’s first case for %s', (status) => {
    expect(DATES.map(([published, withdrawn]) => checkCsvWorkLifecycle(status, published, withdrawn))).toEqual(
      EXPECTED[status],
    );
  });

  it('decides no case that reads a rejected date, and goes on to the next', () => {
    // A rejected publication_date does not hide case 2, which reads only withdrawn_date.
    expect(checkCsvWorkLifecycle(WorkStatus.Forthcoming, undefined, PUBLISHED)).toBe('withdrawnDateNotAllowed');
    expect(checkCsvWorkLifecycle(WorkStatus.Withdrawn, undefined, null)).toBe('withdrawnDateRequired');
    expect(checkCsvWorkLifecycle(WorkStatus.Withdrawn, undefined, BEFORE)).toBeUndefined();
    expect(checkCsvWorkLifecycle(WorkStatus.Active, undefined, null)).toBeUndefined();
    expect(checkCsvWorkLifecycle(WorkStatus.Forthcoming, PUBLISHED, undefined)).toBeUndefined();
    expect(checkCsvWorkLifecycle(WorkStatus.Superseded, PUBLISHED, undefined)).toBeUndefined();
  });
});

describe('readCsvWholeNumber and readCsvPrice (P-2)', () => {
  const invalid = { kind: 'invalid' };
  const blank = { kind: 'blank' };
  const number = (value: number) => ({ kind: 'number', value });

  it.each([
    // A-1
    ['0', number(0)],
    ['00', number(0)],
    ['1.5', invalid],
    ['-1', invalid],
    ['2x', invalid],
    ['0x10', invalid],
    ['1e3', invalid],
    // A-2
    ['-3', invalid],
    ['12.7', invalid],
    ['3x', invalid],
    ['2147483648', invalid],
    ['+5', invalid],
    ['5.0', invalid],
    ['99999999999', invalid],
    ['1,200', invalid],
    ['302.0', invalid],
    // B-1
    ['', blank],
    [' 2 ', number(2)],
    ['  ', blank],
    // B-2
    ['2147483647', number(2147483647)],
    [' 12 ', number(12)],
    [' 302 ', number(302)],
    // Hidden characters are not whitespace; Infinity is not digits.
    ['12​', invalid],
    ['Infinity', invalid],
  ])('reads whole number %j', (value, expected) => {
    expect(readCsvWholeNumber(value)).toEqual(expected);
  });

  it.each([
    // A-3
    ['-5', invalid],
    ['12,50', invalid],
    ['1e3', invalid],
    ['£12', invalid],
    ['12.5.0', invalid],
    ['+12.50', invalid],
    ['12.50 USD', invalid],
    // B-3
    ['12.50', number(12.5)],
    ['.5', number(0.5)],
    ['5.', number(5)],
    [' 7.25 ', number(7.25)],
    ['0', number(0)],
    ['', blank],
    ['  ', blank],
    // Hidden characters, Infinity, and digits too many to be a finite number.
    ['12​', invalid],
    ['Infinity', invalid],
    ['9'.repeat(400), invalid],
  ])('reads price %j', (value, expected) => {
    expect(readCsvPrice(value)).toEqual(expected);
  });
});

describe('THOTH_URL_PATTERN (B-11)', () => {
  it('is the SQL pattern of thoth migrations/20250000_v1.0.0/up.sql:3265 (work_cover_url_check), byte for byte', () => {
    // Copied from `CONSTRAINT work_cover_url_check CHECK ((cover_url ~* '<pattern>'::text))` at thoth develop@d3941ce5
    // and master@32af2a9d; `~*` is a case-insensitive match.
    const sqlPattern = String.raw`^[^:]*:\/\/(?:[^\/:]*:[^\/@]*@)?(?:[^\/:.]*\.)+([^:\/]+)`;

    expect(THOTH_URL_PATTERN.source).toBe(sqlPattern);
    expect(THOTH_URL_PATTERN.flags).toBe('i');
  });
});

describe('the shared predicates', () => {
  it('reads a work type as a Book Chapter, another Thoth work type, or none', () => {
    expect(csvWorkTypeKind('BOOK_CHAPTER')).toBe('chapter');
    expect(['MONOGRAPH', 'EDITED_BOOK', 'TEXTBOOK', 'JOURNAL_ISSUE', 'BOOK_SET'].map(csvWorkTypeKind)).toEqual(
      new Array(5).fill('nonChapter'),
    );
    expect(['NOVEL', '', 'book_chapter', 'Book Chapter'].map(csvWorkTypeKind)).toEqual(new Array(4).fill('invalid'));
  });

  it('names a contributor slot exactly as the row parser plans one', () => {
    expect(isNamedCsvContributor('Jane', '')).toBe(true);
    expect(isNamedCsvContributor('', 'Doe')).toBe(true);
    expect(isNamedCsvContributor(' ', '')).toBe(true);
    expect(isNamedCsvContributor('', '')).toBe(false);
  });

  it('fills a PDF location exactly as the row parser plans one', () => {
    expect(isCsvPdfLocationFilled('', '', '')).toBe(false);
    expect(isCsvPdfLocationFilled(' ', '', '')).toBe(true);
    expect(isCsvPdfLocationFilled('', '', 'OTHER')).toBe(true);
  });

  it('lists each refused Thema code once, in order, matching own keys exactly', () => {
    expect(refusedThemaCodes('FBA, ZZZZZ, fba, ZZZZZ,, ')).toEqual(['ZZZZZ', 'fba']);
    expect(refusedThemaCodes('hasOwnProperty, valueOf, 1DDU, FBA')).toEqual(['hasOwnProperty', 'valueOf']);
    expect(refusedThemaCodes('')).toEqual([]);
  });
});
