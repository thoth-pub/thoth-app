import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  // Render the translation key verbatim, so a test can assert which label was chosen.
  TranslatedContent: ({ content }: { content: string }) => <span>{content}</span>,
  // Forward the presentation props, so a test can assert how a line is coloured.
  Typography: ({
    children,
    id,
    color,
    className,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    id?: string;
    color?: string;
    className?: string;
    'data-testid'?: string;
  }) => (
    <p id={id} data-color={color} className={className} data-testid={testId}>
      {children}
    </p>
  ),
  TableWrapper: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ cells }: { cells: string[] }) => (
    <thead>
      <tr>
        {cells.map((cell) => (
          <th key={cell}>{cell}</th>
        ))}
      </tr>
    </thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { ImportPlan, ImportSource, OnixImportPlanSidecar, TitleEntity } from '@/src/shared/types';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultChapter, getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';
import { ImportExecutionStatus } from './ImportExecutionStatus';

const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

const titled = (title: string): TitleEntity[] => [{ ...getDefaultTitle(), canonical: true, title, fullTitle: title }];

const work = (id: string, title: string, extra: Partial<WorkEntity> = {}): WorkEntity =>
  getDefaultWork({ id, titles: titled(title), ...extra });

// A coherent three-book plan the states below line up with: book two carries two chapters.
const plan: ImportPlan = {
  works: [
    work('w1', 'First Book', { doi: '10.1/first' }),
    work('w2', 'The Middle Book', { doi: '10.5555/mid' }),
    work('w3', 'Third Book'),
  ],
  chapters: [
    getDefaultChapter({ id: 'c1', relationId: 'w2', titles: titled('Chapter A') }),
    getDefaultChapter({ id: 'c2', relationId: 'w2', titles: titled('Chapter B') }),
  ],
  series: [],
};

const runningState: Extract<ImportExecutionState, { phase: 'running' }> = {
  phase: 'running',
  source,
  total: 3,
  completed: 1,
  current: { position: 2, title: 'The Middle Book', reference: '10.5555/mid', chapterCount: 2 },
  stage: 'chapters',
};

const succeededState: Extract<ImportExecutionState, { phase: 'succeeded' }> = {
  phase: 'succeeded',
  source,
  summary: { total: 3, completed: 3 },
  occurredAt: '2026-08-14T06:30:00.000Z',
};

const failedState: Extract<ImportExecutionState, { phase: 'failed' }> = {
  phase: 'failed',
  source,
  occurredAt: '2026-08-14T06:30:00.000Z',
  failure: {
    total: 3,
    completed: 1,
    current: { position: 2, title: 'The Middle Book', reference: '10.5555/mid', chapterCount: 2 },
    stage: 'chapters',
    message: 'Imprint "Unknown" not found',
  },
};

const ledgerStatus = (position: number) => screen.getByTestId(`ledger-status-${position}`);

describe('ImportExecutionStatus', () => {
  afterEach(cleanup);

  it('renders nothing while idle', () => {
    const { container } = render(<ImportExecutionStatus state={{ phase: 'idle' }} plan={plan} onViewWorks={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('running', () => {
    it('shows an accessible progress bar carrying the top-level book counts', () => {
      render(<ImportExecutionStatus state={runningState} plan={plan} onViewWorks={vi.fn()} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '3');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');
      expect(progressbar).toHaveAttribute('aria-valuetext', '1 / 3');
    });

    it('announces completed/total, the current book and stage, and the remaining count in a live region', () => {
      render(<ImportExecutionStatus state={runningState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('import-progress-count')).toHaveTextContent('1 / 3');
      expect(screen.getByTestId('import-current-position')).toHaveTextContent('2 / 3');
      expect(screen.getByTestId('import-current-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');
      expect(screen.getByTestId('import-chapter-count')).toHaveTextContent('2');
      // 3 total, book 2 in flight, so 1 comes after it and is not yet started.
      expect(screen.getByTestId('import-remaining')).toHaveTextContent('1');
      expect(screen.getByText('bulkImport.running.keepOpen')).toBeInTheDocument();
    });

    it('shows the ordered ledger with the current row Importing and its truthful stage', () => {
      render(<ImportExecutionStatus state={runningState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.getByTestId('import-ledger')).toBeInTheDocument();
      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.importing');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.pending');

      // Only the current row exposes a stage; the pending row shows none.
      expect(screen.getByTestId('ledger-stage-2')).toHaveTextContent('bulkImport.stage.chapters');
      expect(screen.queryByTestId('ledger-stage-3')).not.toBeInTheDocument();
    });

    it('shows a plain starting state before the first reading, with every row Pending', () => {
      render(
        <ImportExecutionStatus
          state={{ phase: 'running', source, total: 3, completed: 0, current: null, stage: null }}
          plan={plan}
          onViewWorks={vi.fn()}
        />,
      );

      expect(screen.getByText('bulkImport.running.starting')).toBeInTheDocument();
      expect(screen.queryByTestId('import-current-title')).not.toBeInTheDocument();
      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.pending');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.pending');
    });

    it('shows the keep-open warning in the normal typography colour, not the pale warning palette (thoth-app#266)', () => {
      const { rerender } = render(<ImportExecutionStatus state={runningState} plan={plan} onViewWorks={vi.fn()} />);

      // warning.main (#ffdd75) on the sand surface (#fff2d9) is about 1.2:1; the typography token (#0e1828) is about 16:1.
      const warning = screen.getByText('bulkImport.running.keepOpen').closest('p');
      expect(warning).not.toHaveAttribute('data-color');
      expect(warning).toHaveClass('text-sm', 'text-(--color-typography)');

      // Still on the same sand running surface, outside the live region, beside the unchanged progress.
      const surface = warning?.closest('section');
      expect(surface).toHaveAttribute('aria-busy', 'true');
      expect(surface).toHaveClass('bg-(--color-modal-content-background)');
      expect(screen.getByRole('status')).not.toContainElement(warning);
      expect(screen.getByTestId('import-progress-count')).toHaveTextContent('1 / 3');
      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');

      // Shown before the first reading too, and in no other state.
      rerender(
        <ImportExecutionStatus
          state={{ ...runningState, completed: 0, current: null, stage: null }}
          plan={plan}
          onViewWorks={vi.fn()}
        />,
      );
      expect(screen.getByText('bulkImport.running.keepOpen')).toBeInTheDocument();

      const otherStates: ImportExecutionState[] = [{ phase: 'idle' }, succeededState, failedState];
      for (const state of otherStates) {
        rerender(<ImportExecutionStatus state={state} plan={plan} onViewWorks={vi.fn()} />);
        expect(screen.queryByText('bulkImport.running.keepOpen')).not.toBeInTheDocument();
      }
    });

    it('shows the current identifier in the normal typography colour, not the white secondary token (thoth-app#270)', () => {
      const { rerender } = render(<ImportExecutionStatus state={runningState} plan={plan} onViewWorks={vi.fn()} />);

      // The secondary token (#fff) on the sand surface (#fff2d9) is about 1.1:1; the typography token (#0e1828) is about 16:1.
      const identifier = screen.getByText('bulkImport.identifier').closest('p');
      expect(identifier).toHaveTextContent(/^bulkImport\.identifier: 10\.5555\/mid$/);
      expect(identifier).not.toHaveAttribute('data-color');
      expect(identifier).toHaveClass('text-sm', 'text-(--color-typography)');
      expect(identifier).not.toHaveClass('text-(--color-typography-secondary)');

      // Still in the live region on the same sand running surface, beside the unchanged progress, book and stage.
      expect(screen.getByRole('status')).toContainElement(identifier);
      const surface = identifier?.closest('section');
      expect(surface).toHaveAttribute('aria-busy', 'true');
      expect(surface).toHaveClass('bg-(--color-modal-content-background)');
      expect(screen.getByTestId('import-progress-count')).toHaveTextContent('1 / 3');
      expect(screen.getByTestId('import-current-position')).toHaveTextContent('2 / 3');
      expect(screen.getByTestId('import-current-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');
      expect(screen.getByTestId('import-chapter-count')).toHaveTextContent('2');
      expect(screen.getByTestId('import-remaining')).toHaveTextContent('1');

      // A book in flight without a reference shows no identifier line, and the rest of its running account is unchanged.
      rerender(
        <ImportExecutionStatus
          state={{ ...runningState, current: { position: 2, title: 'The Middle Book', chapterCount: 2 } }}
          plan={plan}
          onViewWorks={vi.fn()}
        />,
      );
      // The ledger table below still lists the plan's DOI, so the reference is checked within the live region only.
      expect(screen.queryByText('bulkImport.identifier')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).not.toHaveTextContent('10.5555/mid');
      expect(screen.getByTestId('import-current-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');
    });
  });

  describe('succeeded', () => {
    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    });

    it('keeps the full ledger visible with every row Completed until Works is acknowledged', async () => {
      const onViewWorks = vi.fn();
      render(<ImportExecutionStatus state={succeededState} plan={plan} onViewWorks={onViewWorks} />);

      expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument();
      expect(screen.getByTestId('import-success-count')).toHaveTextContent('3 / 3');
      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.completed');

      expect(onViewWorks).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.success.viewWorks' }));
      expect(onViewWorks).toHaveBeenCalledTimes(1);
    });

    it('exposes Copy and Download report actions on success', () => {
      render(<ImportExecutionStatus state={succeededState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'bulkImport.report.copy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'bulkImport.report.download' })).toBeInTheDocument();
    });
  });

  describe('failed', () => {
    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    });

    it('renders a persistent, contextual failure report as an alert', () => {
      render(<ImportExecutionStatus state={failedState} plan={plan} onViewWorks={vi.fn()} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('bulkImport.failure.heading');
      expect(screen.getByTestId('import-failure-position')).toHaveTextContent('2 / 3');
      expect(screen.getByTestId('import-failure-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-failure-completed')).toHaveTextContent('1');
      expect(screen.getByTestId('import-failure-not-started')).toHaveTextContent('1');
      expect(screen.getByTestId('import-failure-message')).toHaveTextContent('Imprint "Unknown" not found');
      expect(screen.getByText('bulkImport.failure.partialWarning')).toBeInTheDocument();
    });

    it('shows the ledger with proven rows Completed, the failed row Failed, and later rows Not attempted', () => {
      render(<ImportExecutionStatus state={failedState} plan={plan} onViewWorks={vi.fn()} />);

      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.failed');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.notAttempted');
    });

    it('offers no retry or resume action', () => {
      render(<ImportExecutionStatus state={failedState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /retry|resume/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/retry|resume/i)).not.toBeInTheDocument();
    });

    it('copies the complete report — source, totals, the ordered ledger and the error — with no stack', async () => {
      render(<ImportExecutionStatus state={failedState} plan={plan} onViewWorks={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));

      const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(written).toContain('Import type: ONIX');
      expect(written).toContain('Source file: catalogue.xml');
      expect(written).toContain('Result: Stopped');
      expect(written).toContain('2. Failed — The Middle Book — 10.5555/mid — stage: Creating chapters');
      expect(written).toContain('Error: Imprint "Unknown" not found');
      expect(written).not.toMatch(/\n\s+at\s/);

      expect(await screen.findByTestId('import-copy-feedback')).toBeInTheDocument();
    });

    it('downloads the same report content as Copy, through a client-side blob', async () => {
      // A minimal Blob that records its parts, so the downloaded text can be read back (jsdom's
      // Blob has no `text()` here) and compared against what Copy wrote.
      class CapturingBlob {
        readonly type: string;
        readonly #parts: string[];
        constructor(parts: string[], options?: BlobPropertyBag) {
          this.#parts = parts;
          this.type = options?.type ?? '';
        }
        text() {
          return Promise.resolve(this.#parts.join(''));
        }
      }
      const createObjectURL = vi.fn((_blob: unknown) => 'blob:mock');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      vi.stubGlobal('Blob', CapturingBlob);
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      render(<ImportExecutionStatus state={failedState} plan={plan} onViewWorks={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));
      const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.download' }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as CapturingBlob;
      expect(blob.type).toContain('text/plain');
      const downloaded = await blob.text();

      // Copy and Download are built from the same report, so they cannot drift.
      expect(downloaded).toBe(copied);

      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  });

  /**
   * APP-CSV-D11-A (thoth-app#281): a CSV plan refused before execution. Its own terminal state: zero created, zero sent,
   * every published-status entry named, and none of a stopped run's partial-import, cleanup or retry wording.
   */
  describe('rejected before execution (APP-CSV-D11-A)', () => {
    const csvSource: ImportSource = { type: 'csv', filename: 'books.csv' };
    const message =
      'CSV bulk import refused before execution because the plan contains published-status Works (3 violations), so nothing was created.';
    const rejectedState: Extract<ImportExecutionState, { phase: 'rejected' }> = {
      phase: 'rejected',
      source: csvSource,
      occurredAt: '2026-11-10T12:00:00.000Z',
      rejection: {
        total: 3,
        completed: 0,
        issuedMutations: 0,
        message,
        violations: [
          { entity: 'work', position: 3, status: 'ACTIVE', title: 'Third Book' },
          { entity: 'chapter', position: 2, status: 'WITHDRAWN', title: 'Chapter B', parentPosition: 2 },
          { entity: 'chapter', position: 3, status: 'SUPERSEDED', title: 'Stray', parentPosition: null },
        ],
      },
    };

    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    });

    it('renders the refusal as an alert: zero created, zero sent, and no cleanup because nothing started', () => {
      render(<ImportExecutionStatus state={rejectedState} plan={plan} onViewWorks={vi.fn()} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('bulkImport.rejected.heading');
      expect(alert).toHaveTextContent('bulkImport.rejected.body');
      expect(screen.getByTestId('import-rejected-completed')).toHaveTextContent('0');
      expect(screen.getByTestId('import-rejected-mutations')).toHaveTextContent('0');
      expect(screen.getByTestId('import-rejected-no-cleanup')).toHaveTextContent('bulkImport.rejected.noCleanup');
    });

    it('names every published-status entry, a stray chapter included', () => {
      render(<ImportExecutionStatus state={rejectedState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.getByTestId('import-rejected-work-3')).toHaveTextContent('bulkImport.rejected.work');
      expect(screen.getByTestId('import-rejected-chapter-2')).toHaveTextContent('bulkImport.rejected.chapter');
      expect(screen.getByTestId('import-rejected-chapter-3')).toHaveTextContent('bulkImport.rejected.chapterUnmatched');
    });

    it('marks the affected books Rejected and the others Not attempted, with no stage', () => {
      render(<ImportExecutionStatus state={rejectedState} plan={plan} onViewWorks={vi.fn()} />);

      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.notAttempted');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.rejected');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.rejected');
      expect(screen.queryByTestId('ledger-stage-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ledger-stage-3')).not.toBeInTheDocument();
    });

    it('shows no failure, partial-import warning, cleanup, retry or view-works action', () => {
      render(<ImportExecutionStatus state={rejectedState} plan={plan} onViewWorks={vi.fn()} />);

      expect(screen.queryByText('bulkImport.failure.heading')).not.toBeInTheDocument();
      expect(screen.queryByText('bulkImport.failure.partialWarning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('import-cleanup')).not.toBeInTheDocument();
      expect(screen.queryByText(/bulkImport\.cleanup\./)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry|resume/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'bulkImport.success.viewWorks' })).not.toBeInTheDocument();
    });

    it('copies and downloads one identical report that matches the ledger and names every rejected position', async () => {
      class CapturingBlob {
        readonly type: string;
        readonly #parts: string[];
        constructor(parts: string[], options?: BlobPropertyBag) {
          this.#parts = parts;
          this.type = options?.type ?? '';
        }
        text() {
          return Promise.resolve(this.#parts.join(''));
        }
      }
      const createObjectURL = vi.fn((_blob: unknown) => 'blob:mock');
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
      vi.stubGlobal('Blob', CapturingBlob);
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      render(<ImportExecutionStatus state={rejectedState} plan={plan} onViewWorks={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));
      const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.download' }));
      const downloaded = await (createObjectURL.mock.calls[0][0] as CapturingBlob).text();

      expect(downloaded).toBe(copied);
      expect(copied).toContain('Import type: CSV');
      expect(copied).toContain('Result: Rejected before execution');
      expect(copied).toContain('Fully processed: 0');
      expect(copied).toContain('Mutations issued: 0.');
      expect(copied).toContain('1. Not attempted — First Book — 10.1/first');
      expect(copied).toContain('2. Rejected — The Middle Book — 10.5555/mid');
      expect(copied).toContain('3. Rejected — Third Book — (no identifier)');
      expect(copied).toContain('- Book 3 of 3: ACTIVE — Third Book');
      expect(copied).toContain('- Chapter 2 (of book 2): WITHDRAWN — Chapter B');
      expect(copied).toContain('- Chapter 3 (of no book in the plan): SUPERSEDED — Stray');
      expect(copied).not.toMatch(/not atomic|partially created|rolled back|Cleanup:|Retry|Result: Stopped/i);

      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  });

  describe('an ONIX run (thoth-app#187)', () => {
    const onixPlan: ImportPlan = {
      works: [work('work-3', 'A New Book')],
      chapters: [],
      series: [],
      execution: {
        units: [
          {
            unitKey: 'UNIT|g1',
            sourceOrder: 1,
            groupKey: 'g1',
            target: { kind: 'EXISTING_WORK', workId: 'w-held' },
            display: { title: 'A Book Thoth Holds', reference: null },
            actions: [],
          },
          {
            unitKey: 'UNIT|g2',
            sourceOrder: 2,
            groupKey: 'g2',
            target: { kind: 'EXISTING_WORK', workId: 'w-existing' },
            display: { title: 'An Existing Book', reference: '10.1/existing' },
            actions: [
              {
                kind: 'CREATE_PUBLICATION',
                actionKey: 'UNIT|g2|PUBLICATION|p1',
                work: { kind: 'EXISTING_WORK', workId: 'w-existing' },
                productKey: 'p1',
                publication: { source: 'ATTACHMENT', publication: getDefaultPublication({ isbn: '9781800640000' }) },
              },
            ],
          },
          {
            unitKey: 'UNIT|g3',
            sourceOrder: 3,
            groupKey: 'g3',
            target: { kind: 'PLANNED_WORK', workId: 'work-3' },
            display: { title: 'A New Book', reference: null },
            actions: [{ kind: 'CREATE_WORK', actionKey: 'UNIT|g3|WORK', workId: 'work-3' }],
          },
        ],
      },
    };
    const failedOn = (
      cleanup: NonNullable<Extract<ImportExecutionState, { phase: 'failed' }>['failure']['cleanup']>,
    ): Extract<ImportExecutionState, { phase: 'failed' }> => ({
      phase: 'failed',
      source,
      occurredAt: '2026-10-01T06:30:00.000Z',
      failure: {
        total: 3,
        completed: 1,
        current: {
          position: 2,
          title: 'An Existing Book',
          reference: '10.1/existing',
          chapterCount: 0,
          unit: 'EXISTING_WORK',
        },
        stage: 'publication',
        message: 'Price refused',
        cleanup,
      },
    });

    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    });

    it('shows every unit in the ledger, saying what each targets, with a nothing-to-do unit counted completed', () => {
      render(
        <ImportExecutionStatus
          state={{
            phase: 'running',
            source,
            total: 3,
            completed: 1,
            current: { position: 2, title: 'An Existing Book', chapterCount: 0, unit: 'EXISTING_WORK' },
            stage: 'publication',
          }}
          plan={onixPlan}
          onViewWorks={vi.fn()}
        />,
      );

      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.publication');
      expect([1, 2, 3].map((position) => screen.getByTestId(`ledger-unit-${position}`).textContent)).toEqual([
        'bulkImport.ledger.unit.NOOP',
        'bulkImport.ledger.unit.EXISTING_WORK',
        'bulkImport.ledger.unit.NEW_WORK',
      ]);
      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.importing');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.pending');
    });

    it('keeps the failed stage, and says no cleanup was needed and the complete file may be checked again', () => {
      render(
        <ImportExecutionStatus
          state={failedOn({ status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' })}
          plan={onixPlan}
          onViewWorks={vi.fn()}
        />,
      );

      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.failed');
      expect(screen.getByTestId('import-cleanup')).toHaveAttribute('data-cleanup-status', 'NOT_REQUIRED');
      expect(screen.getByTestId('import-cleanup-status')).toHaveTextContent('bulkImport.cleanup.status.NOT_REQUIRED');
      expect(screen.getByTestId('import-cleanup-retry')).toHaveTextContent(
        'bulkImport.cleanup.retry.COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
      );
      // The CSV partial warning is a CSV run's: an ONIX unit says what became of its own writes instead.
      expect(screen.queryByText('bulkImport.failure.partialWarning')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry|resume/i })).not.toBeInTheDocument();
    });

    it('says a verified cleanup removed everything, accepts contributor residue, and allows a fresh complete-file check', () => {
      render(
        <ImportExecutionStatus
          state={failedOn({
            status: 'VERIFIED',
            retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
            compensated: [
              { operation: 'DELETE_PUBLICATION', entityId: 'publication-1', actionKey: 'a', stage: 'publication' },
            ],
          })}
          plan={onixPlan}
          onViewWorks={vi.fn()}
        />,
      );

      expect(screen.getByTestId('import-cleanup-status')).toHaveTextContent('bulkImport.cleanup.status.VERIFIED');
      expect(screen.getByText('bulkImport.cleanup.contributorResidue')).toBeInTheDocument();
      expect(screen.getByTestId('import-cleanup-retry')).toHaveTextContent(
        'bulkImport.cleanup.retry.COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
      );
      expect(screen.queryByTestId('import-cleanup-failures')).not.toBeInTheDocument();
    });

    it('lists what a failed or unknown cleanup could not prove removed, requires manual reconciliation, and reports it', async () => {
      render(
        <ImportExecutionStatus
          state={failedOn({
            status: 'FAILED_OR_UNKNOWN',
            retry: 'MANUAL_RECONCILIATION_REQUIRED',
            compensated: [],
            failures: [
              {
                operation: 'DELETE_PUBLICATION',
                entityId: 'publication-1',
                actionKey: 'UNIT|g2|PUBLICATION|p1',
                stage: 'publication',
                reason: 'Delete timed out',
              },
            ],
          })}
          plan={onixPlan}
          onViewWorks={vi.fn()}
        />,
      );

      expect(screen.getByTestId('import-cleanup-status')).toHaveTextContent(
        'bulkImport.cleanup.status.FAILED_OR_UNKNOWN',
      );
      expect(screen.getByTestId('import-cleanup-failures')).toHaveTextContent(
        'bulkImport.cleanup.operation.DELETE_PUBLICATION publication-1 — Delete timed out',
      );
      expect(screen.getByTestId('import-cleanup-retry')).toHaveTextContent(
        'bulkImport.cleanup.retry.MANUAL_RECONCILIATION_REQUIRED',
      );

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));

      const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(written).toContain('Execution units: 3');
      expect(written).toContain('Failed stage: Creating publications');
      expect(written).toContain('Cleanup: failed or unknown.');
      expect(written).toContain('Manual reconciliation required');
    });
  });

  describe('an ONIX import with publisher fixes (thoth-app#283)', () => {
    const fix = {
      recovery: 'PUBLISHER_SUPPLIED_VALUE',
      rule: 'R-EDITION-STATEMENT',
      decision: 'PUBLISHER',
      action: 'SET_EDITION_NUMBER',
      path: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
      sourcePath: null,
      valuePath: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/EditionNumber[1]',
      original: null,
      value: '3',
      originalTextFormat: null,
      valueTextFormat: null,
    } as const;
    // The plan's sidecar as a fixed import resolves it: only what the report reads of it is stated.
    const fixedPlan: ImportPlan = {
      ...plan,
      onix: {
        issues: [
          {
            severity: 'warning',
            code: 'onix.source.recovered',
            message: 'Corrected by the publisher',
            source: { kind: 'onix', productIndex: 1 },
            sourceValidation: { kind: 'recovery', recovery: fix },
          },
        ],
      } as unknown as OnixImportPlanSidecar,
    };
    const copiedReport = async (state: ImportExecutionState, planned: ImportPlan) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      render(<ImportExecutionStatus state={state} plan={planned} onViewWorks={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));
      cleanup();
      return writeText.mock.calls[0][0] as string;
    };

    it.each([
      ['succeeded', succeededState],
      ['stopped', failedState],
    ] as const)('lists every publisher fix in the copied report when the run %s', async (_, state) => {
      const report = await copiedReport(state, fixedPlan);

      expect(report).toContain('Corrected by the publisher in the import review: 1 fix');
      expect(report).toContain(
        [
          '- Rule R-EDITION-STATEMENT at /ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
          '  In the file: not stated',
          '  Imported: 3',
          '  Publisher decision; the submitted file is unchanged.',
        ].join('\n'),
      );
    });

    it.each([
      ['succeeded', succeededState],
      ['stopped', failedState],
    ] as const)(
      'never lists a fix as imported for a book the plan held back when the run %s (review B1)',
      async (_, state) => {
        const heldBack = [
          {
            groupKey: 'work:product:gtin13:9780000000002',
            productKeys: ['product:gtin13:9780000000002'],
            records: [{ recordKey: 'record:1', index: 1, recordReference: 'fix.held', isbn: '9780000000002' }],
            title: 'A Held-Back Book',
            isbns: ['9780000000002'],
            findings: [],
          },
        ];
        const report = await copiedReport(state, {
          ...fixedPlan,
          onix: { ...fixedPlan.onix, heldBack } as unknown as OnixImportPlanSidecar,
        });

        expect(report).toContain('- A Held-Back Book — ISBN: 9780000000002 — not imported');
        expect(report).toContain(
          [
            '- Rule R-EDITION-STATEMENT at /ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
            '  In the file: not stated',
            "  Publisher's value: 3",
            '  Not imported: this book was held back, so this fix was not used.',
            '  Publisher decision; the submitted file is unchanged.',
          ].join('\n'),
        );
        expect(report).not.toContain('  Imported: ');
      },
    );

    it.each([
      ['succeeded', succeededState],
      ['stopped', failedState],
    ] as const)('leaves the report unchanged when nothing was fixed and the run %s', async (_, state) => {
      const whole = await copiedReport(state, plan);

      expect(whole).not.toContain('Corrected by the publisher');
      expect(await copiedReport(state, { ...plan, onix: { issues: [] } as unknown as OnixImportPlanSidecar })).toBe(
        whole,
      );
    });
  });

  describe('an ONIX partial import (thoth-app#282)', () => {
    const heldBack = [
      {
        groupKey: 'work:product:gtin13:9781802820010',
        productKeys: ['product:gtin13:9781802820010'],
        records: [{ recordKey: 'record:4', index: 4, recordReference: 'rp.held', isbn: '9781802820010' }],
        title: 'A Held-Back Book',
        isbns: ['9781802820010'],
        findings: [
          {
            id: 'R-EDITION-STATEMENT',
            tier: 'INVENTORY',
            stage: 8,
            scope: 'VALIDITY',
            class: 'NORMATIVE_INVALID',
            blocking: true,
            projection: 'AUTHORITATIVE',
            recoverability: 'NOT_RECOVERABLE',
            counts: true,
            path: '/ONIXMessage[1]/Product[4]/DescriptiveDetail[1]',
            sourcePath: '/ONIXMessage[1]/Product[4]/DescriptiveDetail[1]',
            message: 'An EditionStatement is accompanied by an EditionType or an EditionNumber',
          },
        ],
      },
    ] as const;
    // The plan's sidecar as a partial import resolves it: only what the report reads of it is stated.
    const partialPlan: ImportPlan = { ...plan, onix: { heldBack } as unknown as OnixImportPlanSidecar };
    const copiedReport = async (state: ImportExecutionState, planned: ImportPlan) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      render(<ImportExecutionStatus state={state} plan={planned} onViewWorks={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.report.copy' }));
      cleanup();
      return writeText.mock.calls[0][0] as string;
    };

    it.each([
      ['succeeded', succeededState],
      ['stopped', failedState],
    ] as const)('lists every held-back book, with its findings, as not imported when the run %s', async (_, state) => {
      const report = await copiedReport(state, partialPlan);

      expect(report).toContain('Held back, not imported: 1 book');
      expect(report).toContain('- A Held-Back Book — ISBN: 9781802820010 — not imported');
      expect(report).toContain('  Products in the file: 4 (rp.held)');
      expect(report).toContain(
        '  Finding R-EDITION-STATEMENT: An EditionStatement is accompanied by an EditionType or an EditionNumber at /ONIXMessage[1]/Product[4]/DescriptiveDetail[1]',
      );
    });

    it.each([
      ['succeeded', succeededState],
      ['stopped', failedState],
    ] as const)('leaves the report unchanged when nothing is held back and the run %s', async (_, state) => {
      const whole = await copiedReport(state, plan);

      expect(whole).not.toContain('Held back');
      // The same plan whose sidecar holds nothing back reports exactly the same.
      expect(await copiedReport(state, { ...plan, onix: { heldBack: [] } as unknown as OnixImportPlanSidecar })).toBe(
        whole,
      );
    });
  });
});

/**
 * APP-CSV-D11-A (thoth-app#281): every D11-A message key is present and non-blank in all four locale files, with the
 * English placeholders. Presence is checked in each file itself: the pre-existing German `bulkImport.*` gaps fall back
 * to English, and are out of scope, but D11-A's own keys may not.
 */
describe('APP-CSV-D11-A messages', () => {
  type Tree = { [key: string]: string | Tree };
  const at = (tree: Tree, path: string): string | Tree | undefined =>
    path
      .split('.')
      .reduce<string | Tree | undefined>((node, key) => (typeof node === 'object' ? node[key] : undefined), tree);
  const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(([, name]) => name).sort();
  const KEYS = [
    'errors.csvPublishedStatusBlocked',
    'issueSummary.code.csv.execution.published_status_blocked',
    'bulkImport.ledger.status.rejected',
    'bulkImport.rejected.heading',
    'bulkImport.rejected.body',
    'bulkImport.rejected.completed',
    'bulkImport.rejected.issuedMutations',
    'bulkImport.rejected.noCleanup',
    'bulkImport.rejected.violationsHeading',
    'bulkImport.rejected.work',
    'bulkImport.rejected.chapter',
    'bulkImport.rejected.chapterUnmatched',
    'bulkImport.rejected.next',
  ];

  it.each(['en', 'de', 'es', 'pt'])(
    'are present and non-blank in %s, with the English placeholders',
    async (locale) => {
      const messages = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as Tree;
      const english = (await import('@/src/shared/i18n/locales/en/common.json')) as Tree;

      KEYS.forEach((key) => {
        const text = at(messages, key);

        expect(typeof text, key).toBe('string');
        expect(text as string, key).toMatch(/\S/);
        expect(placeholders(text as string), key).toEqual(placeholders(at(english, key) as string));
      });
    },
  );

  it('names the canonical status and the row in the parse message, and calls no status invalid', async () => {
    const english = (await import('@/src/shared/i18n/locales/en/common.json')) as Tree;

    expect(placeholders(at(english, 'errors.csvPublishedStatusBlocked') as string)).toEqual(['field', 'row', 'status']);
    expect(at(english, 'errors.csvPublishedStatusBlocked')).toMatch(/refused before anything was created/);
    expect(at(english, 'errors.csvPublishedStatusBlocked')).toMatch(/is not invalid/);
  });
});
