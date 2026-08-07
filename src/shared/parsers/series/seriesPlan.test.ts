import { describe, expect, it } from 'vitest';

import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';

import { getDefaultWork } from '../../utils/work';
import {
  buildSeriesPlan,
  describeSources,
  findExistingSeries,
  normalizeSeriesName,
  resolveSeriesCandidate,
  type SeriesCandidate,
  type SeriesCandidateInput,
  seriesIdentity,
  type SeriesPlanMessages,
} from './seriesPlan';

/**
 * The rules every importer shares live here, so they are tested here once rather than twice
 * over. The ONIX and CSV parsers keep their own adapter-level regression tests for what they
 * genuinely decide themselves: which element or column holds the series name, whether a record
 * may create a missing series, and how errors are phrased.
 */

const IMPRINT = 'imprint-1';
const OTHER_IMPRINT = 'imprint-2';

/** Message stubs that echo their inputs, so assertions read as data rather than as prose. */
const messages: SeriesPlanMessages = {
  ambiguousMatch: ({ name, count, source }) => `ambiguous|${name}|${count}|${source}`,
  conflictingMatches: ({ name, sources }) => `conflicting|${name}|${sources}`,
  duplicateOrdinal: ({ name, ordinal, sources }) => `duplicate|${name}|${ordinal}|${sources}`,
  ordinalAlreadyInThoth: ({ name, ordinal, sources }) => `taken|${name}|${ordinal}|${sources}`,
};

const makeSeries = (id: string, name: string, imprintId = IMPRINT, ordinals: number[] = []): SeriesEntity => ({
  id,
  name,
  type: 'BOOK_SERIES' as SeriesEntity['type'],
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId,
  imprintName: '',
  url: '',
  cfpUrl: '',
  description: '',
  issues: ordinals.map((ordinal) => ({
    id: `issue-${ordinal}`,
    ordinal,
    workId: `work-${ordinal}`,
    title: '',
    seriesId: id,
    coverUrl: '',
  })),
});

const makeWork = (id: string): WorkEntity => getDefaultWork({ id });

const candidateInput = (overrides: Partial<SeriesCandidateInput> = {}): SeriesCandidateInput => ({
  name: 'Foundations',
  imprintId: IMPRINT,
  sourceIndex: 1,
  sourceDescription: 'record 1',
  creation: { allowed: true },
  ...overrides,
});

/** Resolves a candidate that is expected to resolve, so plan tests stay readable. */
const candidateOf = (input: Partial<SeriesCandidateInput>, serieses: SeriesEntity[] = []): SeriesCandidate => {
  const resolved = resolveSeriesCandidate(candidateInput(input), serieses, messages);

  if ('error' in resolved) throw new Error(`unexpected error: ${resolved.error.message}`);

  return resolved.candidate;
};

describe('normalizeSeriesName', () => {
  it('folds case and collapses whitespace', () => {
    expect(normalizeSeriesName('  Arc   Companions ')).toBe('arc companions');
    expect(normalizeSeriesName('arc companions')).toBe('arc companions');
  });

  it('keeps punctuation, so distinct names stay distinct', () => {
    expect(normalizeSeriesName('Collection Development, Cultural Heritage, and Digital Humanities')).not.toBe(
      normalizeSeriesName('Collection Development: Cultural Heritage and Digital Humanities'),
    );
    expect(normalizeSeriesName('Foundations')).not.toBe(normalizeSeriesName('Foundations II'));
  });
});

describe('seriesIdentity', () => {
  it('is the imprint plus the normalised name', () => {
    expect(seriesIdentity(IMPRINT, ' Arc  Companions ')).toBe(seriesIdentity(IMPRINT, 'arc companions'));
  });

  it('separates the same name under two imprints', () => {
    expect(seriesIdentity(IMPRINT, 'Arc Companions')).not.toBe(seriesIdentity(OTHER_IMPRINT, 'Arc Companions'));
  });
});

describe('findExistingSeries', () => {
  it('finds an exact match inside the imprint', () => {
    const match = findExistingSeries([makeSeries('a', 'Foundations')], 'Foundations', IMPRINT);

    expect(match).toEqual({ status: 'found', series: expect.objectContaining({ id: 'a' }) });
  });

  it('falls back to a normalised match', () => {
    const match = findExistingSeries([makeSeries('a', 'foundations  ii')], 'Foundations II', IMPRINT);

    expect(match).toEqual({ status: 'found', series: expect.objectContaining({ id: 'a' }) });
  });

  it('never leaves the imprint, however identical the name', () => {
    const match = findExistingSeries([makeSeries('a', 'Foundations', OTHER_IMPRINT)], 'Foundations', IMPRINT);

    expect(match).toEqual({ status: 'missing' });
  });

  it('reports two exact matches in one imprint', () => {
    const serieses = [makeSeries('a', 'Foundations'), makeSeries('b', 'Foundations')];

    expect(findExistingSeries(serieses, 'Foundations', IMPRINT)).toEqual({ status: 'ambiguous', count: 2 });
  });

  it('reports two normalised matches in one imprint', () => {
    const serieses = [makeSeries('a', 'Foundations'), makeSeries('b', 'foundations')];

    expect(findExistingSeries(serieses, 'FOUNDATIONS', IMPRINT)).toEqual({ status: 'ambiguous', count: 2 });
  });

  it('prefers one exact match over several normalised candidates', () => {
    const serieses = [makeSeries('a', 'Foundations'), makeSeries('b', 'foundations'), makeSeries('c', 'FOUNDATIONS')];

    expect(findExistingSeries(serieses, 'Foundations', IMPRINT)).toEqual({
      status: 'found',
      series: expect.objectContaining({ id: 'a' }),
    });
  });
});

describe('resolveSeriesCandidate', () => {
  it('carries the matched series id when Thoth has the series', () => {
    const resolved = resolveSeriesCandidate(candidateInput(), [makeSeries('a', 'Foundations')], messages);

    expect(resolved).toEqual({ candidate: expect.objectContaining({ existingSeriesId: 'a' }) });
  });

  it('leaves the series id unset when Thoth does not have the series', () => {
    const resolved = resolveSeriesCandidate(candidateInput(), [], messages);

    expect('candidate' in resolved && resolved.candidate.existingSeriesId).toBeUndefined();
  });

  it('returns a row-tagged error rather than picking one of several matches', () => {
    const serieses = [makeSeries('a', 'Foundations'), makeSeries('b', 'Foundations')];
    const resolved = resolveSeriesCandidate(candidateInput({ sourceIndex: 4 }), serieses, messages);

    expect(resolved).toEqual({ error: { index: 4, message: 'ambiguous|Foundations|2|record 1' } });
  });
});

describe('describeSources', () => {
  it('deduplicates and joins with "and"', () => {
    expect(describeSources([{ sourceDescription: 'row 1' }, { sourceDescription: 'row 1' }])).toBe('row 1');
    expect(describeSources([{ sourceDescription: 'row 1' }, { sourceDescription: 'row 2' }])).toBe('row 1 and row 2');
  });

  it('caps long lists so errors stay readable', () => {
    const sources = [1, 2, 3, 4, 5].map((row) => ({ sourceDescription: `row ${row}` }));

    expect(describeSources(sources)).toBe('row 1, row 2, row 3 and 2 more');
  });
});

describe('buildSeriesPlan', () => {
  it('ignores members with no series at all', () => {
    const { plan, errors } = buildSeriesPlan([{ work: makeWork('w1') }], [], messages);

    expect(plan).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('groups records that share an identity into one entry, in first-appearance order', () => {
    const { plan } = buildSeriesPlan(
      [
        { work: makeWork('w1'), candidate: candidateOf({ name: 'Beta', sourceIndex: 1 }) },
        { work: makeWork('w2'), candidate: candidateOf({ name: 'Alpha', sourceIndex: 2 }) },
        { work: makeWork('w3'), candidate: candidateOf({ name: ' beta ', sourceIndex: 3 }) },
      ],
      [],
      messages,
    );

    expect(plan.map((group) => group.name)).toEqual(['Beta', 'Alpha']);
    expect(plan[0].works.map((work) => work.id)).toEqual(['w1', 'w3']);
  });

  it('proposes a BookSeries for a name Thoth does not have', () => {
    const { plan } = buildSeriesPlan([{ work: makeWork('w1'), candidate: candidateOf({}) }], [], messages);

    expect(plan[0].target).toEqual({
      kind: 'proposed',
      series: { name: 'Foundations', imprintId: IMPRINT, type: 'BOOK_SERIES' },
    });
  });

  it('reuses the existing series when one was matched', () => {
    const serieses = [makeSeries('a', 'Foundations')];
    const { plan } = buildSeriesPlan(
      [{ work: makeWork('w1'), candidate: candidateOf({}, serieses) }],
      serieses,
      messages,
    );

    expect(plan[0].target).toEqual({ kind: 'existing', seriesId: 'a' });
  });

  it('refuses to create a series no record is allowed to create', () => {
    const { plan, errors } = buildSeriesPlan(
      [
        {
          work: makeWork('w1'),
          candidate: candidateOf({ sourceIndex: 7, creation: { allowed: false, reason: 'not allowed here' } }),
        },
      ],
      [],
      messages,
    );

    expect(plan).toEqual([]);
    expect(errors).toEqual([{ index: 7, message: 'not allowed here' }]);
  });

  it('reports a group whose records matched different existing series', () => {
    // Same identity, different matched ids: only reachable when the series list changes shape
    // between records, but it must never be resolved by silently picking one.
    const { plan, errors } = buildSeriesPlan(
      [
        {
          work: makeWork('w1'),
          candidate: { ...candidateOf({}), existingSeriesId: 'a', sourceDescription: 'record 1' },
        },
        {
          work: makeWork('w2'),
          candidate: { ...candidateOf({ sourceIndex: 2 }), existingSeriesId: 'b', sourceDescription: 'record 2' },
        },
      ],
      [],
      messages,
    );

    expect(plan).toEqual([]);
    expect(errors).toEqual([{ index: 1, message: 'conflicting|Foundations|record 1 and record 2' }]);
  });

  describe('ordinals', () => {
    const ordinalsFor = (candidates: SeriesCandidate[], serieses: SeriesEntity[] = []) =>
      buildSeriesPlan(
        candidates.map((candidate, index) => ({ work: makeWork(`w${index + 1}`), candidate })),
        serieses,
        messages,
      );

    it('numbers a new series from 1 in source order', () => {
      const { plan } = ordinalsFor([
        candidateOf({ sourceIndex: 1 }),
        candidateOf({ sourceIndex: 2 }),
        candidateOf({ sourceIndex: 3 }),
      ]);

      expect(plan[0].works.map((work) => work.orderNumber)).toEqual([1, 2, 3]);
    });

    it('appends after the issues the series already has in Thoth', () => {
      const serieses = [makeSeries('a', 'Foundations', IMPRINT, [1, 2, 5])];
      const { plan } = ordinalsFor(
        [candidateOf({ sourceIndex: 1 }, serieses), candidateOf({ sourceIndex: 2 }, serieses)],
        serieses,
      );

      expect(plan[0].works.map((work) => work.orderNumber)).toEqual([6, 7]);
    });

    it('preserves explicit ordinals and reserves them before numbering automatically', () => {
      const { plan } = ordinalsFor([
        candidateOf({ sourceIndex: 1 }),
        candidateOf({ sourceIndex: 2, ordinal: 10 }),
        candidateOf({ sourceIndex: 3 }),
      ]);

      expect(plan[0].works.map((work) => work.orderNumber)).toEqual([11, 10, 12]);
    });

    it('reports two records claiming the same explicit ordinal, and drops the group', () => {
      const { plan, errors } = ordinalsFor([
        candidateOf({ sourceIndex: 1, ordinal: 4, sourceDescription: 'record 1' }),
        candidateOf({ sourceIndex: 2, ordinal: 4, sourceDescription: 'record 2' }),
      ]);

      expect(plan).toEqual([]);
      expect(errors).toEqual([{ index: 1, message: 'duplicate|Foundations|4|record 1 and record 2' }]);
    });

    it('reports an explicit ordinal an existing Thoth issue already uses', () => {
      const serieses = [makeSeries('a', 'Foundations', IMPRINT, [1, 2])];
      const { plan, errors } = ordinalsFor([candidateOf({ sourceIndex: 3, ordinal: 2 }, serieses)], serieses);

      expect(plan).toEqual([]);
      expect(errors).toEqual([{ index: 3, message: 'taken|Foundations|2|record 1' }]);
    });

    it('applies the same collision rules to a series the import would create', () => {
      const { plan, errors } = ordinalsFor([
        candidateOf({ sourceIndex: 1, ordinal: 1, sourceDescription: 'record 1' }),
        candidateOf({ sourceIndex: 2, ordinal: 1, sourceDescription: 'record 2' }),
      ]);

      expect(plan).toEqual([]);
      expect(errors).toHaveLength(1);
    });

    it('orders several collisions by ordinal, tagged with the lowest source index', () => {
      const { errors } = ordinalsFor([
        candidateOf({ sourceIndex: 1, ordinal: 9, sourceDescription: 'record 1' }),
        candidateOf({ sourceIndex: 2, ordinal: 3, sourceDescription: 'record 2' }),
        candidateOf({ sourceIndex: 3, ordinal: 3, sourceDescription: 'record 3' }),
        candidateOf({ sourceIndex: 4, ordinal: 9, sourceDescription: 'record 4' }),
      ]);

      expect(errors).toEqual([
        { index: 2, message: 'duplicate|Foundations|3|record 2 and record 3' },
        { index: 1, message: 'duplicate|Foundations|9|record 1 and record 4' },
      ]);
    });

    it('is independent of the order groups were built in', () => {
      const members = [
        { work: makeWork('w1'), candidate: candidateOf({ name: 'Alpha', sourceIndex: 1 }) },
        { work: makeWork('w2'), candidate: candidateOf({ name: 'Beta', sourceIndex: 2 }) },
        { work: makeWork('w3'), candidate: candidateOf({ name: 'Alpha', sourceIndex: 3 }) },
      ];

      const first = buildSeriesPlan(members, [], messages);
      const second = buildSeriesPlan(members, [], messages);

      expect(first.plan).toEqual(second.plan);
      expect(first.plan.map((group) => group.works.map((work) => [work.id, work.orderNumber]))).toEqual([
        [
          ['w1', 1],
          ['w3', 2],
        ],
        [['w2', 1]],
      ]);
    });
  });
});
