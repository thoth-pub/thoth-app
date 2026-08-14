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
}));

import type { ImportSource } from '@/src/shared/types';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';
import { ImportExecutionStatus } from './ImportExecutionStatus';

describe('ImportExecutionStatus', () => {
  afterEach(cleanup);

  const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

  const runningState: Extract<ImportExecutionState, { phase: 'running' }> = {
    phase: 'running',
    source,
    total: 48,
    completed: 11,
    current: { position: 12, title: 'The Middle Book', reference: '10.5555/mid', chapterCount: 3 },
    stage: 'chapters',
  };

  const failedState: Extract<ImportExecutionState, { phase: 'failed' }> = {
    phase: 'failed',
    source,
    occurredAt: '2026-08-14T06:30:00.000Z',
    failure: {
      total: 48,
      completed: 11,
      current: { position: 12, title: 'The Middle Book', reference: '10.5555/mid', chapterCount: 3 },
      stage: 'chapters',
      message: 'Imprint "Unknown" not found',
    },
  };

  it('renders nothing while idle', () => {
    const { container } = render(<ImportExecutionStatus state={{ phase: 'idle' }} onViewWorks={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('running', () => {
    it('shows an accessible progress bar carrying the top-level book counts', () => {
      render(<ImportExecutionStatus state={runningState} onViewWorks={vi.fn()} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '48');
      expect(progressbar).toHaveAttribute('aria-valuenow', '11');
      expect(progressbar).toHaveAttribute('aria-valuetext', '11 / 48');
    });

    it('announces completed/total, the current book and stage, and the remaining count in a live region', () => {
      render(<ImportExecutionStatus state={runningState} onViewWorks={vi.fn()} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('import-progress-count')).toHaveTextContent('11 / 48');
      expect(screen.getByTestId('import-current-position')).toHaveTextContent('12 / 48');
      expect(screen.getByTestId('import-current-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-current-stage')).toHaveTextContent('bulkImport.stage.chapters');
      expect(screen.getByTestId('import-chapter-count')).toHaveTextContent('3');
      // 48 total, book 12 in flight, so 36 come after it and are not yet started.
      expect(screen.getByTestId('import-remaining')).toHaveTextContent('36');
      expect(screen.getByText('bulkImport.running.keepOpen')).toBeInTheDocument();
    });

    it('shows a plain starting state before the first reading arrives', () => {
      render(
        <ImportExecutionStatus
          state={{ phase: 'running', source, total: 3, completed: 0, current: null, stage: null }}
          onViewWorks={vi.fn()}
        />,
      );

      expect(screen.getByText('bulkImport.running.starting')).toBeInTheDocument();
      expect(screen.queryByTestId('import-current-title')).not.toBeInTheDocument();
    });
  });

  describe('succeeded', () => {
    it('shows the completion summary and continues to Works only when acknowledged', async () => {
      const onViewWorks = vi.fn();
      render(
        <ImportExecutionStatus
          state={{ phase: 'succeeded', source, summary: { total: 5, completed: 5 } }}
          onViewWorks={onViewWorks}
        />,
      );

      expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument();
      expect(screen.getByTestId('import-success-count')).toHaveTextContent('5 / 5');

      expect(onViewWorks).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.success.viewWorks' }));
      expect(onViewWorks).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed', () => {
    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    });

    it('renders a persistent, contextual failure report as an alert', () => {
      render(<ImportExecutionStatus state={failedState} onViewWorks={vi.fn()} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('bulkImport.failure.heading');
      expect(screen.getByTestId('import-failure-position')).toHaveTextContent('12 / 48');
      expect(screen.getByTestId('import-failure-title')).toHaveTextContent('The Middle Book');
      expect(screen.getByTestId('import-failure-completed')).toHaveTextContent('11');
      expect(screen.getByTestId('import-failure-not-started')).toHaveTextContent('36');
      expect(screen.getByTestId('import-failure-message')).toHaveTextContent('Imprint "Unknown" not found');
      expect(screen.getByText('bulkImport.failure.partialWarning')).toBeInTheDocument();
    });

    it('offers no retry or resume action', () => {
      render(<ImportExecutionStatus state={failedState} onViewWorks={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /retry|resume/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/retry|resume/i)).not.toBeInTheDocument();
    });

    it('copies a plain-text report with the context and no stack, and confirms it copied', async () => {
      render(<ImportExecutionStatus state={failedState} onViewWorks={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: 'bulkImport.failure.copyReport' }));

      const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(written).toContain('Import type: ONIX');
      expect(written).toContain('Source file: catalogue.xml');
      expect(written).toContain('Stopped at: book 12 of 48');
      expect(written).toContain('Error: Imprint "Unknown" not found');
      expect(written).not.toMatch(/\n\s+at\s/);

      expect(await screen.findByTestId('import-copy-feedback')).toBeInTheDocument();
    });
  });
});
