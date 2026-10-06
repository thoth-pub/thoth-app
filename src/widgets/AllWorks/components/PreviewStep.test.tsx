import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBulkCreateWorks } = vi.hoisted(() => ({ mockBulkCreateWorks: vi.fn() }));

/**
 * A finished preflight that found nothing, so these tests exercise the confirmation and execution
 * behaviour they were written for. The preflight's own states — checking, failed, retried, and
 * what a finding looks like — are covered against the real hook in `__tests__/preview-step-preflight`.
 */
const emptyReport = {
  summary: {
    works: 1,
    chapters: 0,
    existingSeries: 0,
    proposedSeries: 0,
    worksWithDoi: 0,
    worksWithIsbn: 0,
    worksWithAnyCheckedIdentifier: 0,
    worksWithoutCheckedIdentifier: 1,
    affectedWorks: 0,
    duplicateFindings: 0,
  },
  duplicateFindings: [],
  blockingDuplicateFindings: [],
  onix: null,
  ready: true,
};

// Only the barrel's hooks are stubbed. `useBulkImportExecution` still runs for real, along with
// the real ImportExecutionError it reads, which is imported from its own module below.
vi.mock('@/src/entities/work', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useBulkCreateWorks: () => ({ bulkCreateWorks: mockBulkCreateWorks, loading: false }),
  // An ONIX plan's report is bound to the very sidecar it was built from, as the real hook binds it.
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useImportPreflight: (plan: { onix?: unknown }) => ({
    report: { ...emptyReport, onix: plan.onix ?? null },
    isChecking: false,
    hasFailed: false,
    retry: vi.fn(),
  }),
}));

vi.mock('@/src/shared/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
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
}));

import { ImportExecutionError } from '@/src/entities/work/model/import-execution.error';
import { SeriesType } from '@/src/shared/constants/series';
import type {
  ImportExecutionProgress,
  ImportIssue,
  ImportPlan,
  ImportSource,
  SeriesImportPlan,
} from '@/src/shared/types';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { PreviewStep } from './PreviewStep';

describe('PreviewStep', () => {
  const works = [getDefaultWork({ id: 'work-1' })];
  const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

  const planOf = (series: SeriesImportPlan = [], chapters = []): ImportPlan => ({ works, chapters, series });

  /** A running reading with sensible defaults, so a test only names the fields it cares about. */
  const progress = (overrides: Partial<ImportExecutionProgress> = {}): ImportExecutionProgress => ({
    total: 3,
    completed: 1,
    current: { position: 2, title: 'Two', reference: '10/two', chapterCount: 0 },
    stage: 'work',
    ...overrides,
  });

  /** A mutation that emits one reading, then stays pending until the returned resolver is called. */
  const pendingImport = (reading: ImportExecutionProgress) => {
    let resolveImport: () => void = () => {};
    mockBulkCreateWorks.mockImplementation(
      (_plan: ImportPlan, observer: { onProgress?: (p: ImportExecutionProgress) => void }) => {
        observer.onProgress?.(reading);
        return new Promise<void>((resolve) => {
          resolveImport = resolve;
        });
      },
    );
    return () => resolveImport();
  };

  beforeEach(() => {
    mockBulkCreateWorks.mockReset();
  });

  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const renderStep = (props: Partial<React.ComponentProps<typeof PreviewStep>> = {}) =>
    render(<PreviewStep plan={planOf()} source={source} onSubmit={vi.fn()} {...props} />);

  it('replaces the preview with a running state and prevents a second submission', async () => {
    pendingImport(
      progress({
        total: 48,
        completed: 11,
        current: { position: 12, title: 'Mid', reference: '10/mid', chapterCount: 3 },
        stage: 'chapters',
      }),
    );

    renderStep();

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));

    // The running state is on screen, carrying the truthful top-level counts and current context.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByTestId('import-progress-count')).toHaveTextContent('11 / 48');
    expect(screen.getByTestId('import-current-position')).toHaveTextContent('12 / 48');
    expect(screen.getByTestId('import-current-title')).toHaveTextContent('Mid');
    expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');
    expect(screen.getByTestId('import-remaining')).toHaveTextContent('36');
    expect(screen.getByText('bulkImport.running.keepOpen')).toBeInTheDocument();

    // The Create button is gone, so there is nothing to press a second time.
    expect(screen.queryByRole('button', { name: 'actions.create' })).not.toBeInTheDocument();
  });

  it('drops the ready-to-import phase the moment the run starts, replaced by the running state', async () => {
    pendingImport(progress());

    renderStep();

    // The ready phase stands at the confirmation boundary before anything runs.
    expect(screen.getByTestId('import-phase-ready')).toHaveTextContent('bulkImport.phase.ready');

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));
    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));

    // It is gone with the rest of the preview; the running state is now the authoritative
    // "importing" phase, so there is no ready phase lingering beside it.
    expect(screen.queryByTestId('import-phase-ready')).not.toBeInTheDocument();
    expect(screen.getByText('bulkImport.running.keepOpen')).toBeInTheDocument();
  });

  it('shows a success state before navigating, and continues to Works only when acknowledged', async () => {
    mockBulkCreateWorks.mockResolvedValue(undefined);

    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument());
    // The completion state is shown first; navigation waits for the user to acknowledge it.
    expect(onSubmit).not.toHaveBeenCalled();
    // The terminal success state carries no leftover ready phase.
    expect(screen.queryByTestId('import-phase-ready')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'bulkImport.success.viewWorks' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps a persistent, contextual failure report after the mutation rejects, with no retry and no navigation', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    mockBulkCreateWorks.mockImplementation(
      (_plan: ImportPlan, observer: { onProgress?: (p: ImportExecutionProgress) => void }) => {
        observer.onProgress?.(progress());
        return Promise.reject(
          new ImportExecutionError('Imprint "Unknown" not found', {
            total: 3,
            completed: 1,
            current: { position: 2, title: 'Two', reference: '10/two', chapterCount: 0 },
            stage: 'work',
          }),
        );
      },
    );

    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('bulkImport.failure.heading'));
    // The original API message survives, attached to its execution context.
    expect(screen.getByTestId('import-failure-message')).toHaveTextContent('Imprint "Unknown" not found');
    expect(screen.getByTestId('import-failure-position')).toHaveTextContent('2 / 3');
    expect(screen.getByTestId('import-failure-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('import-failure-not-started')).toHaveTextContent('1');
    expect(screen.getByText('bulkImport.failure.partialWarning')).toBeInTheDocument();
    // The stopped terminal state carries no leftover ready phase.
    expect(screen.queryByTestId('import-phase-ready')).not.toBeInTheDocument();

    // No navigation, no retry/resume, and no Create button to re-run the same non-idempotent plan.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /retry|resume/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'actions.create' })).not.toBeInTheDocument();

    // The rejection is handled internally, so nothing escapes as an unhandled rejection.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });

  it('registers a beforeunload guard while running and removes it once the run ends', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const finishImport = pendingImport(progress());

    renderStep();

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));
    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(removeSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));

    finishImport();
    await waitFor(() => expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument());

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('tells the parent when the run starts and stops, so the modal can lock its exits', async () => {
    const finishImport = pendingImport(progress());
    const onRunningChange = vi.fn();

    renderStep({ onRunningChange });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));
    await waitFor(() => expect(onRunningChange).toHaveBeenCalledWith(true));

    finishImport();
    await waitFor(() => expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument());

    // The last thing the parent hears is that the run is over. The unlock is published from a
    // passive effect, which React flushes after the commit that paints the success heading, so
    // seeing the heading does not yet mean the parent has been told: wait for the notification
    // itself. The assertion stays on the *final* call, since the mount reading is `false` too.
    await waitFor(() => expect(onRunningChange.mock.calls.at(-1)?.[0]).toBe(false));
  });

  it('locks the modal synchronously with the Create press, before the first mutation runs', async () => {
    // A single ordered log of both signals: when the parent is told the run is running, and when
    // the mutation is actually dispatched. Their relative order is the whole point of the test.
    const order: string[] = [];
    const onRunningChange = vi.fn((running: boolean) => order.push(`running:${running}`));
    mockBulkCreateWorks.mockImplementation(
      (_plan: ImportPlan, observer: { onProgress?: (p: ImportExecutionProgress) => void }) => {
        order.push('mutation');
        observer.onProgress?.(progress());
        // Stays pending, so the run sits in its running state for the assertions.
        return new Promise<void>(() => {});
      },
    );

    renderStep({ onRunningChange });

    // Ignore the mount reading; watch only what pressing Create sets in motion.
    order.length = 0;
    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    // The lock is the very first thing the click produces, and it lands before the mutation is
    // dispatched. Were the lock left to the running-state effect, the mutation would be recorded
    // first and the modal would still be dismissible for that render — this ordering forbids it.
    expect(order[0]).toBe('running:true');
    expect(order[1]).toBe('mutation');
  });

  it('does nothing when Create is pressed before a source is known', async () => {
    mockBulkCreateWorks.mockResolvedValue(undefined);

    renderStep({ source: null });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(mockBulkCreateWorks).not.toHaveBeenCalled();
  });

  it('marks works headed for a series the import will create', () => {
    renderStep({
      plan: planOf([
        {
          name: 'Arc Companions',
          target: {
            kind: 'proposed',
            series: { name: 'Arc Companions', imprintId: 'imprint-1', type: SeriesType.enum.BookSeries },
          },
          // Membership is a reference to the plan's own work.
          members: [{ workId: works[0].id, orderNumber: 1 }],
        },
      ]),
    });

    expect(screen.getByText('Arc Companions')).toBeInTheDocument();
    expect(screen.getByText('will be created')).toBeInTheDocument();
  });

  it("lists the plan's chapters alongside its works", () => {
    const chapter = { ...getDefaultWork({ id: 'chapter-1' }), relationId: 'work-1' };

    render(<PreviewStep plan={{ works, chapters: [chapter], series: [] }} source={source} onSubmit={vi.fn()} />);

    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  describe('session ledger', () => {
    const titled = (title: string) => [{ ...getDefaultTitle(), canonical: true, title, fullTitle: title }];
    const worksOf = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        getDefaultWork({ id: `w${index + 1}`, titles: titled(`Book ${index + 1}`) }),
      );
    const ledgerStatus = (position: number) => screen.getByTestId(`ledger-status-${position}`);

    it('shows and advances the per-book ledger as progress readings arrive, agreeing with the summary', async () => {
      let observer: { onProgress?: (p: ImportExecutionProgress) => void } = {};
      mockBulkCreateWorks.mockImplementation(
        (_plan: ImportPlan, obs: { onProgress?: (p: ImportExecutionProgress) => void }) => {
          observer = obs;
          obs.onProgress?.({
            total: 3,
            completed: 0,
            current: { position: 1, title: 'Book 1', chapterCount: 0 },
            stage: 'work',
          });
          // Stays pending, so the run sits in its running state for the assertions.
          return new Promise<void>(() => {});
        },
      );

      render(<PreviewStep plan={{ works: worksOf(3), chapters: [], series: [] }} source={source} onSubmit={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));
      await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalled());

      // First reading: book 1 in flight, the rest not yet started.
      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.importing');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.pending');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.pending');

      // Advancing to book 2 marks only the proven prior book completed; the summary agrees.
      act(() =>
        observer.onProgress?.({
          total: 3,
          completed: 1,
          current: { position: 2, title: 'Book 2', chapterCount: 0 },
          stage: 'work',
        }),
      );

      expect(ledgerStatus(1)).toHaveTextContent('bulkImport.ledger.status.completed');
      expect(ledgerStatus(2)).toHaveTextContent('bulkImport.ledger.status.importing');
      expect(ledgerStatus(3)).toHaveTextContent('bulkImport.ledger.status.pending');
      expect(screen.getByTestId('import-current-position')).toHaveTextContent('2 / 3');
    });
  });

  describe('an ONIX run (thoth-app#187)', () => {
    /** An ONIX plan that creates no Work: it attaches a Publication to one existing Work, and has nothing to do for another. */
    const onixPlan: ImportPlan = {
      works: [],
      chapters: [],
      series: [],
      execution: {
        units: [
          {
            unitKey: 'UNIT|g1',
            sourceOrder: 1,
            groupKey: 'g1',
            target: { kind: 'EXISTING_WORK', workId: 'w-existing' },
            display: { title: 'An Existing Book', reference: null },
            actions: [
              {
                kind: 'CREATE_PUBLICATION',
                actionKey: 'UNIT|g1|PUBLICATION|p1',
                work: { kind: 'EXISTING_WORK', workId: 'w-existing' },
                productKey: 'p1',
                publication: { source: 'ATTACHMENT', publication: getDefaultPublication({ isbn: '9781800640000' }) },
              },
            ],
          },
          {
            unitKey: 'UNIT|g2',
            sourceOrder: 2,
            groupKey: 'g2',
            target: { kind: 'EXISTING_WORK', workId: 'w-held' },
            display: { title: 'A Book Thoth Holds', reference: null },
            actions: [],
          },
        ],
      },
      onix: {
        kind: 'onix',
        version: 1,
        executable: true,
        blockers: [],
        issues: [],
        workGroups: [],
        products: [],
        findings: [],
      } as unknown as ImportPlan['onix'],
    };

    it('counts the run in execution units, and shows an existing-Work and a nothing-to-do unit in the ledger', async () => {
      pendingImport({
        total: 2,
        completed: 0,
        current: { position: 1, title: 'An Existing Book', chapterCount: 0, unit: 'EXISTING_WORK' },
        stage: 'publication',
      });

      render(<PreviewStep plan={onixPlan} source={source} onSubmit={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));
      await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledWith(onixPlan, expect.anything()));

      expect(screen.getByTestId('import-current-position')).toHaveTextContent('1 / 2');
      expect(screen.getByTestId('ledger-unit-1')).toHaveTextContent('bulkImport.ledger.unit.EXISTING_WORK');
      expect(screen.getByTestId('ledger-unit-2')).toHaveTextContent('bulkImport.ledger.unit.NOOP');
    });

    it('never offers a stopped run as safe to try again when the failure says nothing of what it wrote', async () => {
      mockBulkCreateWorks.mockRejectedValue(new Error('socket hang up'));

      render(<PreviewStep plan={onixPlan} source={source} onSubmit={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('bulkImport.failure.heading'));
      expect(screen.getByTestId('import-failure-message')).toHaveTextContent('socket hang up');
      expect(screen.getByTestId('import-cleanup')).toHaveAttribute('data-cleanup-status', 'FAILED_OR_UNKNOWN');
      expect(screen.getByTestId('import-cleanup-retry')).toHaveTextContent(
        'bulkImport.cleanup.retry.MANUAL_RECONCILIATION_REQUIRED',
      );
      expect(screen.queryByRole('button', { name: 'actions.create' })).not.toBeInTheDocument();
    });
  });

  describe('warnings', () => {
    it('lists a CSV preview’s warnings exactly as before, in the order given', () => {
      const csvWarning = (message: string, row: number): ImportIssue => ({
        severity: 'warning',
        code: 'csv.validation',
        message,
        source: { kind: 'csv', row },
      });

      render(
        <PreviewStep
          plan={planOf()}
          source={{ type: 'csv', filename: 'catalogue.csv' }}
          warnings={[csvWarning('row 2 warning', 2), csvWarning('row 4 warning', 4)]}
          onSubmit={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('import-issue-summary')).not.toBeInTheDocument();
      expect(screen.getByText('warnings')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'row 2 warning',
        'row 4 warning',
      ]);
      expect(screen.getByRole('button', { name: 'actions.create' })).not.toBeDisabled();
    });

    it('renders nothing extra for a CSV preview when there is nothing to warn about', () => {
      render(
        <PreviewStep
          plan={planOf()}
          source={{ type: 'csv', filename: 'catalogue.csv' }}
          warnings={[]}
          onSubmit={vi.fn()}
        />,
      );

      expect(screen.queryByText('warnings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('import-issue-summary')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'actions.create' })).not.toBeDisabled();
    });
  });

});
