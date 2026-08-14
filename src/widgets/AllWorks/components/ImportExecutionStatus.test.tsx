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
  Typography: ({
    children,
    id,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    id?: string;
    'data-testid'?: string;
  }) => (
    <p id={id} data-testid={testId}>
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
import type { ImportPlan, ImportSource, TitleEntity } from '@/src/shared/types';
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
});
