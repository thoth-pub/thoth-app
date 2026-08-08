import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import type { ImportPlan } from '@/src/shared/types';
import { collectImportIdentifiers, importIdentifierKey } from '@/src/shared/utils/importPreflight';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { GET_PUBLICATIONS_BY_ISBN_FILTER, GET_WORKS_BY_IDENTIFIER_FILTER } from '../../model/importPreflight.schema';
import { ImportPreflightService } from '../importPreflight.service';

/**
 * The lookup adapter, tested against what the backend filters actually do.
 *
 * These filters are not equality lookups, and this file is where that is written down.
 * `works(filter:)` is a case-insensitive substring match over `doi`, `reference`, `landing_page`,
 * `resources_description`, canonical title and abstract content; `publications(filter:)` is a
 * substring match on the ISBN with hyphens ignored. So the tests feed back the kind of loose
 * result each really returns and assert that only exact carriers survive.
 */

const PUBLISHER_ID = 'publisher-1';

const existingWorkDto = (workId: string, { doi = '', isbns = [] as string[], title = 'Existing' } = {}) => ({
  workId,
  doi,
  imprintId: 'imprint-1',
  titles: [{ titleId: `${workId}-title`, canonical: true, fullTitle: title, localeCode: 'en', subtitle: null, title }],
  publications: isbns.map((isbn) => ({ isbn })),
});

const planWork = (id: string, { doi = '', isbns = [] as string[] } = {}) =>
  ({
    ...getDefaultWork(),
    id,
    doi,
    titles: [{ ...getDefaultTitle(), canonical: true, title: id, fullTitle: id }],
    publications: isbns.map((isbn, index) => ({ id: `${id}-pub-${index}`, isbn })),
  }) as unknown as WorkEntity;

const plan = (works: WorkEntity[]): ImportPlan => ({ works, chapters: [], series: [] });

describe('ImportPreflightService', () => {
  let graphqlService: GraphqlService;
  let service: ImportPreflightService;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    query = vi.fn().mockResolvedValue({ works: [], publications: [] });
    graphqlService = { query, mutation: vi.fn() } as unknown as GraphqlService;
    service = new ImportPreflightService(graphqlService);
  });

  const doiCalls = () => query.mock.calls.filter(([document]) => document === GET_WORKS_BY_IDENTIFIER_FILTER);
  const isbnCalls = () => query.mock.calls.filter(([document]) => document === GET_PUBLICATIONS_BY_ISBN_FILTER);

  it('scopes every lookup to the active publisher', async () => {
    await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [
        { basis: 'doi', value: 'https://doi.org/10.1234/one' },
        { basis: 'isbn', value: '9781234567897' },
      ],
    });

    expect(query).toHaveBeenCalledTimes(2);
    query.mock.calls.forEach(([, variables]) => {
      expect(variables.publishers).toEqual([PUBLISHER_ID]);
    });
  });

  it('asks about each identifier once, however many works in the plan carry it', async () => {
    const identifiers = collectImportIdentifiers(
      plan([
        planWork('w1', { doi: 'https://doi.org/10.1234/shared', isbns: ['9781234567897'] }),
        planWork('w2', { doi: 'https://doi.org/10.1234/shared', isbns: ['978-1-234-56789-7'] }),
        planWork('w3', { doi: 'HTTPS://DOI.ORG/10.1234/SHARED' }),
      ]),
    );

    await service.findExistingIdentifierMatches({ publisherId: PUBLISHER_ID, identifiers });

    expect(doiCalls()).toHaveLength(1);
    expect(isbnCalls()).toHaveLength(1);
    expect(doiCalls()[0][1].filter).toBe('https://doi.org/10.1234/shared');
    expect(isbnCalls()[0][1].filter).toBe('9781234567897');
  });

  it('makes no request at all when there is nothing to look up', async () => {
    const identifiers = collectImportIdentifiers(plan([planWork('w1'), planWork('w2', { isbns: ['', '   '] })]));

    expect(identifiers).toEqual([]);

    const result = await service.findExistingIdentifierMatches({ publisherId: PUBLISHER_ID, identifiers });

    expect(query).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  /**
   * Offset pagination only means anything over a total order. `PublicationOrderBy::default()`
   * sorts by publication type, which is not unique and gets no id tiebreaker from the backend's
   * single-field ordering, so rows tied on it could sit either side of a page boundary from one
   * request to the next — and a real ISBN match could fall through the gap. Both documents name a
   * unique sort key of their own rather than trusting any default.
   */
  it('orders the work lookup by work id, explicitly', () => {
    const document = JSON.stringify(GET_WORKS_BY_IDENTIFIER_FILTER);

    expect(document).toContain('WORK_ID');
    expect(document).toContain('ASC');
  });

  it('orders the publication lookup by publication id, explicitly', () => {
    const document = JSON.stringify(GET_PUBLICATIONS_BY_ISBN_FILTER);

    expect(document).toContain('PUBLICATION_ID');
    expect(document).toContain('ASC');
  });

  it('reads further pages until one comes back short', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      existingWorkDto(`w${index}`, { doi: 'https://doi.org/10.1234/other' }),
    );
    const secondPage = [existingWorkDto('last', { doi: 'https://doi.org/10.1234/wanted' })];

    query.mockResolvedValueOnce({ works: firstPage }).mockResolvedValueOnce({ works: secondPage });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }],
    });

    expect(doiCalls().map(([, variables]) => variables.offset)).toEqual([0, 100]);
    expect(result.get(importIdentifierKey({ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }))).toEqual([
      expect.objectContaining({ workId: 'last' }),
    ]);
  });

  it('rejects a work the DOI filter returned that does not carry that exact DOI', async () => {
    // All three are results `works(filter:)` genuinely produces: a longer DOI containing the
    // requested one as a substring, a work matched on its title, and a work matched on its
    // `reference`. None of them carries the DOI that was asked for.
    query.mockResolvedValueOnce({
      works: [
        existingWorkDto('substring', { doi: 'https://doi.org/10.1234/wanted-extended' }),
        existingWorkDto('title-match', { doi: '', title: 'A book about https://doi.org/10.1234/wanted' }),
        existingWorkDto('reference-match', { doi: 'https://doi.org/10.5555/unrelated' }),
        existingWorkDto('exact', { doi: 'https://doi.org/10.1234/wanted' }),
      ],
    });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }],
    });

    const matches = result.get(importIdentifierKey({ basis: 'doi', value: 'https://doi.org/10.1234/wanted' })) ?? [];

    expect(matches.map(({ workId }) => workId)).toEqual(['exact']);
  });

  it('rejects a publication the ISBN filter returned that does not carry that exact ISBN', async () => {
    query.mockResolvedValueOnce({
      publications: [
        { publicationId: 'p1', isbn: '978-1-234-56789-7', work: existingWorkDto('exact') },
        // The backend compares hyphen-stripped substrings, so a longer ISBN string containing
        // the requested digits comes back too.
        { publicationId: 'p2', isbn: '9781234567897123', work: existingWorkDto('substring') },
      ],
    });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'isbn', value: '9781234567897' }],
    });

    const matches = result.get(importIdentifierKey({ basis: 'isbn', value: '9781234567897' })) ?? [];

    expect(matches.map(({ workId }) => workId)).toEqual(['exact']);
  });

  /**
   * The page boundary is where an unordered query would lose a match, so the exact case the
   * ordering exists to make safe is covered directly: a match that only appears on the second
   * page still reaches the report, and the substring results around it are still rejected.
   */
  it('keeps an exact ISBN match that only appears on a later page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      publicationId: `p${index}`,
      // Substring hits from the backend's hyphen-stripped `LIKE`, none of them the exact ISBN.
      isbn: `97801985266361${index}`,
      work: existingWorkDto(`w${index}`),
    }));
    const secondPage = [
      { publicationId: 'p-last', isbn: '978-0-19-852663-6', work: existingWorkDto('exact-on-second-page') },
    ];

    query.mockResolvedValueOnce({ publications: firstPage }).mockResolvedValueOnce({ publications: secondPage });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'isbn', value: '9780198526636' }],
    });

    expect(isbnCalls().map(([, variables]) => variables.offset)).toEqual([0, 100]);
    expect(isbnCalls().map(([, variables]) => variables.limit)).toEqual([100, 100]);

    const matches = result.get(importIdentifierKey({ basis: 'isbn', value: '9780198526636' })) ?? [];

    expect(matches.map(({ workId }) => workId)).toEqual(['exact-on-second-page']);
  });

  /**
   * The plan's identifiers are normalised before the service sees them, so an ISBN-10 in a source
   * file is asked about as the ISBN-13 Thoth actually stores — which is also the only form the
   * backend's ISBN filter could match.
   */
  it('searches for an imported ISBN-10 using its canonical ISBN-13', async () => {
    const identifiers = collectImportIdentifiers(plan([planWork('w1', { isbns: ['0-19-852663-6'] })]));

    expect(identifiers).toEqual([{ basis: 'isbn', value: '9780198526636' }]);

    query.mockResolvedValueOnce({
      publications: [{ publicationId: 'p1', isbn: '978-0-19-852663-6', work: existingWorkDto('existing-thirteen') }],
    });

    const result = await service.findExistingIdentifierMatches({ publisherId: PUBLISHER_ID, identifiers });

    expect(isbnCalls()[0][1].filter).toBe('9780198526636');

    const matches = result.get(importIdentifierKey({ basis: 'isbn', value: '9780198526636' })) ?? [];

    expect(matches.map(({ workId }) => workId)).toEqual(['existing-thirteen']);
  });

  it('keeps every existing work that exactly carries the identifier', async () => {
    query.mockResolvedValueOnce({
      works: [
        existingWorkDto('first', { doi: 'https://doi.org/10.1234/wanted', title: 'First' }),
        existingWorkDto('second', { doi: 'HTTPS://DOI.ORG/10.1234/WANTED', title: 'Second' }),
      ],
    });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }],
    });

    const matches = result.get(importIdentifierKey({ basis: 'doi', value: 'https://doi.org/10.1234/wanted' })) ?? [];

    expect(matches.map(({ workId }) => workId)).toEqual(['first', 'second']);
  });

  it('returns a display summary of the existing work, not the work itself', async () => {
    query.mockResolvedValueOnce({
      works: [
        existingWorkDto('first', {
          doi: 'https://doi.org/10.1234/wanted',
          title: 'An Existing Book',
          isbns: ['978-1-234-56789-7', ''],
        }),
      ],
    });

    const result = await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [{ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }],
    });

    expect(result.get(importIdentifierKey({ basis: 'doi', value: 'https://doi.org/10.1234/wanted' }))).toEqual([
      {
        workId: 'first',
        title: 'An Existing Book',
        imprintId: 'imprint-1',
        doi: 'https://doi.org/10.1234/wanted',
        isbns: ['978-1-234-56789-7'],
      },
    ]);
  });

  it('never asks for a publisher other than the active one, and never for an unfiltered list', async () => {
    await service.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers: [
        { basis: 'doi', value: 'https://doi.org/10.1234/one' },
        { basis: 'isbn', value: '9781234567897' },
      ],
    });

    query.mock.calls.forEach(([, variables]) => {
      expect(variables.publishers).toEqual([PUBLISHER_ID]);
      // Every request is a targeted question about one identifier. Nothing here can degrade into
      // "fetch this publisher's works and scan them".
      expect(variables.filter).toBeTruthy();
      expect(variables.limit).toBeLessThanOrEqual(100);
    });
  });
});
