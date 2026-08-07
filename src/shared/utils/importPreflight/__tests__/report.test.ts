import { describe, expect, it } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { SeriesType } from '@/src/shared/constants/series';
import type {
  ExistingWorkMatch,
  ExistingWorkMatchesByIdentifier,
  ImportPlan,
  SeriesImportGroup,
} from '@/src/shared/types';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { collectImportIdentifiers, importIdentifierKey } from '../identifiers';
import { buildImportPreflightReport } from '../report';

/**
 * The preflight's analysis, tested as data: a plan and a set of existing matches in, an exact
 * report out. No React, no GraphQL and no lookup timing involved, which is the point of keeping
 * the builder pure.
 */

const work = (id: string, { title, doi = '', isbns = [] }: { title: string; doi?: string; isbns?: string[] }) =>
  ({
    ...getDefaultWork(),
    id,
    doi,
    titles: [{ ...getDefaultTitle(), canonical: true, title, fullTitle: title }],
    publications: isbns.map((isbn, index) => ({ id: `${id}-pub-${index}`, isbn })),
  }) as unknown as WorkEntity;

const plan = (works: WorkEntity[], extra: Partial<ImportPlan> = {}): ImportPlan => ({
  works,
  chapters: [],
  series: [],
  ...extra,
});

const existing = (
  workId: string,
  { title = 'Existing', doi = '', isbns = [] as string[] } = {},
): ExistingWorkMatch => ({
  workId,
  title,
  imprintId: 'imprint-1',
  doi,
  isbns,
});

const matches = (entries: [string, ExistingWorkMatch[]][]): ExistingWorkMatchesByIdentifier => new Map(entries);

const NO_MATCHES: ExistingWorkMatchesByIdentifier = new Map();

const doiKey = (value: string) => importIdentifierKey({ basis: 'doi', value });
const isbnKey = (value: string) => importIdentifierKey({ basis: 'isbn', value });

describe('buildImportPreflightReport', () => {
  it('reports no findings, and says the work could not be checked, when it carries no identifier', () => {
    const report = buildImportPreflightReport(plan([work('w1', { title: 'No identifiers' })]), NO_MATCHES);

    expect(report.duplicateFindings).toEqual([]);
    expect(report.summary.worksWithAnyCheckedIdentifier).toBe(0);
    expect(report.summary.worksWithoutCheckedIdentifier).toBe(1);
    expect(report.summary.worksWithDoi).toBe(0);
    expect(report.summary.worksWithIsbn).toBe(0);
  });

  it('reports nothing for a DOI only one imported work carries', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'One', doi: 'https://doi.org/10.1234/one' }),
        work('w2', { title: 'Two', doi: 'https://doi.org/10.1234/two' }),
      ]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toEqual([]);
    expect(report.summary.worksWithDoi).toBe(2);
    expect(report.summary.affectedWorks).toBe(0);
  });

  it('groups two imported works sharing a DOI into one finding, in source order', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'First', doi: 'https://doi.org/10.1234/shared' }),
        work('w2', { title: 'Second', doi: 'https://doi.org/10.1234/shared' }),
      ]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toHaveLength(1);

    const [finding] = report.duplicateFindings;

    expect(finding.basis).toBe('doi');
    expect(finding.value).toBe('https://doi.org/10.1234/shared');
    expect(finding.importedWorks.map(({ workId }) => workId)).toEqual(['w1', 'w2']);
    expect(finding.importedWorks.map(({ importIndex }) => importIndex)).toEqual([0, 1]);
    expect(finding.existingWorks).toEqual([]);
    expect(report.summary.affectedWorks).toBe(2);
  });

  it('groups two imported works sharing an ISBN into one finding', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'First', isbns: ['9781234567897'] }),
        work('w2', { title: 'Second', isbns: ['9781234567897'] }),
      ]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].basis).toBe('isbn');
    expect(report.duplicateFindings[0].importedWorks.map(({ workId }) => workId)).toEqual(['w1', 'w2']);
  });

  it('does not treat one work repeating an ISBN across its own publications as a duplicate', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Two formats, one ISBN', isbns: ['9781234567897', '978-1-234-56789-7'] })]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toEqual([]);
    expect(report.summary.worksWithIsbn).toBe(1);
  });

  it('reports a DOI an imported work shares with an existing Thoth work', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Imported', doi: 'https://doi.org/10.1234/shared' })]),
      matches([[doiKey('https://doi.org/10.1234/shared'), [existing('existing-1', { title: 'Existing' })]]]),
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].basis).toBe('doi');
    expect(report.duplicateFindings[0].importedWorks.map(({ workId }) => workId)).toEqual(['w1']);
    expect(report.duplicateFindings[0].existingWorks.map(({ workId }) => workId)).toEqual(['existing-1']);
  });

  it('reports an ISBN an imported work shares with an existing Thoth work', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Imported', isbns: ['978-1-234-56789-7'] })]),
      matches([[isbnKey('9781234567897'), [existing('existing-1')]]]),
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].basis).toBe('isbn');
    expect(report.duplicateFindings[0].existingWorks.map(({ workId }) => workId)).toEqual(['existing-1']);
  });

  it('keeps every existing work an identifier matches, choosing no winner', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Imported', doi: 'https://doi.org/10.1234/shared' })]),
      matches([
        [
          doiKey('https://doi.org/10.1234/shared'),
          [existing('existing-2', { title: 'Beta' }), existing('existing-1', { title: 'Alpha' })],
        ],
      ]),
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].existingWorks.map(({ workId }) => workId)).toEqual(['existing-1', 'existing-2']);
  });

  it('drops an existing work repeated across its own publication records', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Imported', isbns: ['9781234567897'] })]),
      matches([
        [
          isbnKey('9781234567897'),
          [existing('existing-1', { title: 'Alpha' }), existing('existing-1', { title: 'Alpha' })],
        ],
      ]),
    );

    expect(report.duplicateFindings[0].existingWorks.map(({ workId }) => workId)).toEqual(['existing-1']);
  });

  it('puts an in-upload duplicate and an existing match on one identifier into a single finding', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'First', doi: 'https://doi.org/10.1234/shared' }),
        work('w2', { title: 'Second', doi: 'https://doi.org/10.1234/shared' }),
      ]),
      matches([[doiKey('https://doi.org/10.1234/shared'), [existing('existing-1')]]]),
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].importedWorks.map(({ workId }) => workId)).toEqual(['w1', 'w2']);
    expect(report.duplicateFindings[0].existingWorks.map(({ workId }) => workId)).toEqual(['existing-1']);
  });

  it('reports a matching DOI and a matching ISBN on one work as two separate findings', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Imported', doi: 'https://doi.org/10.1234/shared', isbns: ['9781234567897'] })]),
      matches([
        [doiKey('https://doi.org/10.1234/shared'), [existing('existing-1')]],
        [isbnKey('9781234567897'), [existing('existing-2')]],
      ]),
    );

    expect(report.duplicateFindings.map(({ basis }) => basis)).toEqual(['doi', 'isbn']);
    expect(report.summary.duplicateFindings).toBe(2);
    // Two signals about one work is still one affected work.
    expect(report.summary.affectedWorks).toBe(1);
  });

  it('treats ISBNs differing only in hyphens, spaces and case as one signal', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'First', isbns: ['978-1-234-56789-7'] }),
        work('w2', { title: 'Second', isbns: [' 9781234567897 '] }),
      ]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].value).toBe('9781234567897');
  });

  it('treats DOIs differing only in case as one signal, following the application rule', () => {
    const report = buildImportPreflightReport(
      plan([
        work('w1', { title: 'First', doi: 'https://doi.org/10.1234/Shared' }),
        work('w2', { title: 'Second', doi: 'https://doi.org/10.1234/shared' }),
      ]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toHaveLength(1);
    expect(report.duplicateFindings[0].value).toBe('https://doi.org/10.1234/shared');
  });

  it('ignores blank identifiers', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'First', doi: '', isbns: ['', '  '] }), work('w2', { title: 'Second', doi: '   ' })]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toEqual([]);
    expect(report.summary.worksWithoutCheckedIdentifier).toBe(2);
  });

  it('does not treat two works with the same title as a duplicate', () => {
    const report = buildImportPreflightReport(
      plan([work('w1', { title: 'Identical Title' }), work('w2', { title: 'Identical Title' })]),
      NO_MATCHES,
    );

    expect(report.duplicateFindings).toEqual([]);
  });

  it('does not treat two works with the same reference as a duplicate', () => {
    const shared = { ...work('w1', { title: 'First' }), reference: 'onix-record-reference-1' };
    const other = { ...work('w2', { title: 'Second' }), reference: 'onix-record-reference-1' };

    const report = buildImportPreflightReport(plan([shared, other]), NO_MATCHES);

    expect(report.duplicateFindings).toEqual([]);
  });

  it('orders findings by first affected work, then DOI before ISBN, whatever order matches arrive in', () => {
    const works = [
      work('w1', { title: 'First', isbns: ['9781111111111'] }),
      work('w2', { title: 'Second', doi: 'https://doi.org/10.1234/second', isbns: ['9782222222222'] }),
      work('w3', { title: 'Third', doi: 'https://doi.org/10.1234/third' }),
    ];

    const entries: [string, ExistingWorkMatch[]][] = [
      [doiKey('https://doi.org/10.1234/third'), [existing('e3')]],
      [isbnKey('9782222222222'), [existing('e2b')]],
      [doiKey('https://doi.org/10.1234/second'), [existing('e2a')]],
      [isbnKey('9781111111111'), [existing('e1')]],
    ];

    const forward = buildImportPreflightReport(plan(works), matches(entries));
    const reversed = buildImportPreflightReport(plan(works), matches([...entries].reverse()));

    const expected = [
      { basis: 'isbn', value: '9781111111111' },
      { basis: 'doi', value: 'https://doi.org/10.1234/second' },
      { basis: 'isbn', value: '9782222222222' },
      { basis: 'doi', value: 'https://doi.org/10.1234/third' },
    ];

    expect(forward.duplicateFindings.map(({ basis, value }) => ({ basis, value }))).toEqual(expected);
    expect(reversed.duplicateFindings.map(({ basis, value }) => ({ basis, value }))).toEqual(expected);
  });

  it('summarises the plan, its series and how much of it could be checked', () => {
    const existingGroup: SeriesImportGroup = {
      name: 'Existing Series',
      target: { kind: 'existing', seriesId: 'series-1' },
      members: [{ workId: 'w1', orderNumber: 1 }],
    };
    const proposedGroup: SeriesImportGroup = {
      name: 'Proposed Series',
      target: {
        kind: 'proposed',
        series: { name: 'Proposed Series', imprintId: 'imprint-1', type: SeriesType.enum.BookSeries },
      },
      members: [{ workId: 'w2', orderNumber: 1 }],
    };

    const report = buildImportPreflightReport(
      plan(
        [
          work('w1', { title: 'With DOI', doi: 'https://doi.org/10.1234/shared' }),
          work('w2', { title: 'With ISBN', isbns: ['9781234567897'] }),
          work('w3', { title: 'With both', doi: 'https://doi.org/10.1234/shared', isbns: ['9789999999999'] }),
          work('w4', { title: 'With neither' }),
        ],
        {
          chapters: [work('c1', { title: 'Chapter' })],
          series: [existingGroup, proposedGroup],
        },
      ),
      NO_MATCHES,
    );

    expect(report.summary).toEqual({
      works: 4,
      chapters: 1,
      existingSeries: 1,
      proposedSeries: 1,
      worksWithDoi: 2,
      worksWithIsbn: 2,
      worksWithAnyCheckedIdentifier: 3,
      worksWithoutCheckedIdentifier: 1,
      affectedWorks: 2,
      duplicateFindings: 1,
    });
  });

  it('collects distinct identifiers to look up, never the same value twice', () => {
    const identifiers = collectImportIdentifiers(
      plan([
        work('w1', { title: 'First', doi: 'https://doi.org/10.1234/shared', isbns: ['9781234567897'] }),
        work('w2', { title: 'Second', doi: 'HTTPS://DOI.ORG/10.1234/SHARED', isbns: ['978-1-234-56789-7'] }),
        work('w3', { title: 'Third' }),
      ]),
    );

    expect(identifiers).toEqual([
      { basis: 'doi', value: 'https://doi.org/10.1234/shared' },
      { basis: 'isbn', value: '9781234567897' },
    ]);
  });

  it('collects no identifiers from chapters', () => {
    const identifiers = collectImportIdentifiers(
      plan([work('w1', { title: 'Work' })], {
        chapters: [work('c1', { title: 'Chapter', doi: 'https://doi.org/10.1234/chapter' })],
      }),
    );

    expect(identifiers).toEqual([]);
  });
});
