import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
};

// Only the barrel's hooks are stubbed. `useBulkImportExecution` still runs for real, along with
// the real ImportExecutionError it reads, which is imported from its own module below.
vi.mock('@/src/entities/work', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useBulkCreateWorks: () => ({ bulkCreateWorks: mockBulkCreateWorks, loading: false }),
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useImportPreflight: () => ({ report: emptyReport, isChecking: false, hasFailed: false, retry: vi.fn() }),
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
import { getDefaultWork } from '@/src/shared/utils/work';

import { PreviewStep } from './PreviewStep';

describe('PreviewStep', () => {
  const works = [getDefaultWork({ id: 'work-1' })];
  const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

  const planOf = (series: SeriesImportPlan = [], chapters = []): ImportPlan => ({ works, chapters, series });

  const warning = (message: string, productIndex: number): ImportIssue => ({
    severity: 'warning',
    code: 'onix.series.non_publisher_collection_skipped',
    message,
    source: { kind: 'onix', productIndex },
  });

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

  it('shows a success state before navigating, and continues to Works only when acknowledged', async () => {
    mockBulkCreateWorks.mockResolvedValue(undefined);

    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument());
    // The completion state is shown first; navigation waits for the user to acknowledge it.
    expect(onSubmit).not.toHaveBeenCalled();

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

    // The last thing the parent hears is that the run is over.
    expect(onRunningChange.mock.calls.at(-1)?.[0]).toBe(false);
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

  describe('warnings', () => {
    it('shows a warning without standing in the way of confirming', () => {
      render(
        <PreviewStep
          plan={planOf()}
          source={source}
          warnings={[warning('Series "Editorial Studies" will not be created', 2)]}
          onSubmit={vi.fn()}
        />,
      );

      expect(screen.getByText('warnings')).toBeInTheDocument();
      expect(screen.getByText('Series "Editorial Studies" will not be created')).toBeInTheDocument();
      // The preview is the acknowledgement: nothing to tick, nothing to dismiss.
      expect(screen.getByRole('button', { name: 'actions.create' })).not.toBeDisabled();
    });

    it('shows several warnings in the order they were given', () => {
      render(
        <PreviewStep
          plan={planOf()}
          source={source}
          warnings={[warning('second product', 2), warning('fourth product', 4)]}
          onSubmit={vi.fn()}
        />,
      );

      const rendered = screen.getAllByRole('listitem').map((item) => item.textContent);

      expect(rendered).toEqual(['second product', 'fourth product']);
    });

    it('renders nothing extra when there is nothing to warn about', () => {
      render(<PreviewStep plan={planOf()} source={source} warnings={[]} onSubmit={vi.fn()} />);

      expect(screen.queryByText('warnings')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'actions.create' })).not.toBeDisabled();
    });
  });
});
