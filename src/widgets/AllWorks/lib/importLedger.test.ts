import { describe, expect, it } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { ImportExecutionStage, ImportPlan, ImportSource, SeriesImportPlan, TitleEntity } from '@/src/shared/types';
import { getDefaultChapter, getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';
import { deriveImportLedger } from './importLedger';

const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

const titled = (title: string): TitleEntity[] => [{ ...getDefaultTitle(), canonical: true, title, fullTitle: title }];

const work = (id: string, title: string, extra: Partial<WorkEntity> = {}): WorkEntity =>
  getDefaultWork({ id, titles: titled(title), ...extra });

// Three top-level works exercising all three identity branches: a DOI, a source reference with no
// DOI, and neither. The middle work carries two chapters; a series binds the first and third.
const works: WorkEntity[] = [
  work('w1', 'First Book', { doi: 'https://doi.org/10.1/first' }),
  work('w2', 'Second Book', { reference: 'REF-2' }),
  work('w3', 'Third Book'),
];

const chapters: WorkEntity[] = [
  getDefaultChapter({ id: 'c1', relationId: 'w2', titles: titled('Chapter A') }),
  getDefaultChapter({ id: 'c2', relationId: 'w2', titles: titled('Chapter B') }),
];

const series: SeriesImportPlan = [
  {
    name: 'Arc',
    target: { kind: 'existing', seriesId: 'series-1' },
    members: [
      { workId: 'w1', orderNumber: 1 },
      { workId: 'w3', orderNumber: 2 },
    ],
  },
];

const plan: ImportPlan = { works, chapters, series };

/** A running reading; identity in `current` is deliberately ignored by the ledger, which reads the
 *  plan, so only `position`, `completed` and `stage` shape the result. */
const running = (position: number, completed: number, stage: ImportExecutionStage): ImportExecutionState => ({
  phase: 'running',
  source,
  total: works.length,
  completed,
  current: { position, title: 'ignored', chapterCount: 0 },
  stage,
});

describe('deriveImportLedger', () => {
  it('creates one row per top-level work, in plan order, and none for chapters', () => {
    const ledger = deriveImportLedger(plan, { phase: 'idle' });

    expect(ledger.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(ledger.map((entry) => entry.title)).toEqual(['First Book', 'Second Book', 'Third Book']);
    // Two chapters on work 2, yet still exactly three rows.
    expect(ledger).toHaveLength(works.length);
    expect(ledger[1].chapterCount).toBe(2);
    expect(ledger[0].chapterCount).toBe(0);
  });

  it('derives the identifier truthfully: DOI, then source reference, then none', () => {
    const ledger = deriveImportLedger(plan, { phase: 'idle' });

    expect(ledger[0].reference).toBe('https://doi.org/10.1/first');
    expect(ledger[1].reference).toBe('REF-2');
    expect(ledger[2].reference).toBeUndefined();
  });

  it('marks every row Pending before execution', () => {
    const ledger = deriveImportLedger(plan, { phase: 'idle' });

    expect(ledger.map((entry) => entry.status)).toEqual(['pending', 'pending', 'pending']);
    expect(ledger.every((entry) => entry.stage === undefined)).toBe(true);
  });

  it('keeps every row Pending while running before the first reading arrives', () => {
    const ledger = deriveImportLedger(plan, {
      phase: 'running',
      source,
      total: works.length,
      completed: 0,
      current: null,
      stage: null,
    });

    expect(ledger.map((entry) => entry.status)).toEqual(['pending', 'pending', 'pending']);
  });

  it('makes the first current row Importing and leaves the rest Pending on the first reading', () => {
    const ledger = deriveImportLedger(plan, running(1, 0, 'work'));

    expect(ledger.map((entry) => entry.status)).toEqual(['importing', 'pending', 'pending']);
    expect(ledger[0].stage).toBe('work');
  });

  it('updates the current row stage without completing it', () => {
    const atWork = deriveImportLedger(plan, running(2, 1, 'work'));
    const atChapters = deriveImportLedger(plan, running(2, 1, 'chapters'));

    expect(atWork[1].status).toBe('importing');
    expect(atWork[1].stage).toBe('work');

    // Same work, a later stage: still importing, never nudged to completed by the stage change.
    expect(atChapters[1].status).toBe('importing');
    expect(atChapters[1].stage).toBe('chapters');
    expect(atChapters[0].status).toBe('completed');
  });

  it('marks only proven prior work Completed as execution advances', () => {
    const atSecond = deriveImportLedger(plan, running(2, 1, 'work'));
    expect(atSecond.map((entry) => entry.status)).toEqual(['completed', 'importing', 'pending']);

    const atThird = deriveImportLedger(plan, running(3, 2, 'series'));
    expect(atThird.map((entry) => entry.status)).toEqual(['completed', 'completed', 'importing']);
  });

  it('marks every row Completed on terminal success', () => {
    const ledger = deriveImportLedger(plan, {
      phase: 'succeeded',
      source,
      summary: { total: works.length, completed: works.length },
      occurredAt: '2026-08-14T06:30:00.000Z',
    });

    expect(ledger.map((entry) => entry.status)).toEqual(['completed', 'completed', 'completed']);
    expect(ledger.every((entry) => entry.stage === undefined)).toBe(true);
  });

  it('marks prior Completed, the current Failed, and later Not attempted after a deterministic failure', () => {
    const ledger = deriveImportLedger(plan, {
      phase: 'failed',
      source,
      occurredAt: '2026-08-14T06:30:00.000Z',
      failure: {
        total: works.length,
        completed: 1,
        current: { position: 2, title: 'Second Book', reference: 'REF-2', chapterCount: 2 },
        stage: 'chapters',
        message: 'Imprint "Unknown" not found',
      },
    });

    expect(ledger.map((entry) => entry.status)).toEqual(['completed', 'failed', 'notAttempted']);
  });

  it('keeps the failed row identifiable, with its title, identifier and stage intact', () => {
    const ledger = deriveImportLedger(plan, {
      phase: 'failed',
      source,
      occurredAt: '2026-08-14T06:30:00.000Z',
      failure: {
        total: works.length,
        completed: 1,
        current: { position: 2, title: 'Second Book', reference: 'REF-2', chapterCount: 2 },
        stage: 'chapters',
        message: 'boom',
      },
    });

    const failed = ledger[1];
    expect(failed.status).toBe('failed');
    expect(failed.title).toBe('Second Book');
    expect(failed.reference).toBe('REF-2');
    expect(failed.stage).toBe('chapters');
    // A failed row is never described as rolled back or completed.
    expect(failed.status).not.toBe('completed');
  });

  it('reports a first-work failure as one Failed row with none Completed', () => {
    const ledger = deriveImportLedger(plan, {
      phase: 'failed',
      source,
      occurredAt: '2026-08-14T06:30:00.000Z',
      failure: {
        total: works.length,
        completed: 0,
        current: { position: 1, title: 'First Book', reference: 'x', chapterCount: 0 },
        stage: 'work',
        message: 'boom',
      },
    });

    expect(ledger.map((entry) => entry.status)).toEqual(['failed', 'notAttempted', 'notAttempted']);
  });

  it('does not mutate the ImportPlan it derives from', () => {
    const snapshot = structuredClone(plan);

    deriveImportLedger(plan, running(2, 1, 'chapters'));
    deriveImportLedger(plan, {
      phase: 'failed',
      source,
      occurredAt: '2026-08-14T06:30:00.000Z',
      failure: {
        total: works.length,
        completed: 1,
        current: { position: 2, title: 'Second Book', chapterCount: 2 },
        stage: 'chapters',
        message: 'boom',
      },
    });

    expect(plan).toEqual(snapshot);
    expect(plan.works).toBe(works);
  });
});
