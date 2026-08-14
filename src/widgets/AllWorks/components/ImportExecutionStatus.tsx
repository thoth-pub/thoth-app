'use client';

import { useId, useState } from 'react';

import type { ImportExecutionStage } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';
import { buildImportErrorReport } from '../lib/importErrorReport';

type ImportExecutionStatusProps = {
  state: ImportExecutionState;
  /** Acknowledge a finished import and continue to the Works list. */
  onViewWorks: () => void;
};

const STAGE_LABEL_KEY: Record<ImportExecutionStage, string> = {
  work: 'bulkImport.stage.work',
  chapters: 'bulkImport.stage.chapters',
  series: 'bulkImport.stage.series',
};

/**
 * The persistent, in-modal report of an import once it has started. It renders exactly one of
 * the running, succeeded, or failed states and nothing at all while idle, so the modal never
 * shows two accounts of the same run at once.
 *
 * Every state announces itself to assistive technology — the running state through a polite live
 * region and a labelled progress bar, the terminal states through an alert — so progress and
 * failure are never conveyed by colour or position alone.
 */
export const ImportExecutionStatus = ({ state, onViewWorks }: ImportExecutionStatusProps) => {
  if (state.phase === 'running') {
    const { total, completed, current, stage } = state;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    // The book in flight is neither done nor "not started"; remaining counts only what comes
    // after it. Before the first reading arrives there is no current book, so remaining falls
    // back to everything not yet finished.
    const remaining = current ? Math.max(total - current.position, 0) : Math.max(total - completed, 0);

    return (
      <RunningState
        total={total}
        completed={completed}
        percent={percent}
        remaining={remaining}
        current={current}
        stage={stage}
      />
    );
  }

  if (state.phase === 'succeeded') {
    return <SuccessState total={state.summary.total} completed={state.summary.completed} onViewWorks={onViewWorks} />;
  }

  if (state.phase === 'failed') {
    return <FailureState state={state} />;
  }

  return null;
};

type RunningStateProps = {
  total: number;
  completed: number;
  percent: number;
  remaining: number;
  current: NonNullable<Extract<ImportExecutionState, { phase: 'running' }>['current']> | null;
  stage: Extract<ImportExecutionState, { phase: 'running' }>['stage'];
};

const RunningState = ({ total, completed, percent, remaining, current, stage }: RunningStateProps) => {
  const labelId = useId();

  return (
    <section
      aria-busy="true"
      className="flex flex-col gap-3 rounded border border-(--color-border) bg-(--color-modal-content-background) p-4"
    >
      <Typography id={labelId} component="h2" fontWeight="bold" className="capitalize">
        <TranslatedContent content="bulkImport.running.heading" />
      </Typography>

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={`${completed} / ${total}`}
        className="h-2 w-full overflow-hidden rounded bg-(--color-border)"
      >
        <div className="h-full rounded bg-(--color-primary) transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      {/*
        The single live region for the run: one polite announcement carries the counts, the book
        in flight, and the stage together, so a screen reader is not interrupted field by field.
      */}
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <Typography>
          <span data-testid="import-progress-count">
            {completed} / {total}
          </span>{' '}
          <TranslatedContent content="bulkImport.running.processed" />
        </Typography>

        {current ? (
          <>
            <Typography>
              <TranslatedContent content="bulkImport.running.currentBook" />{' '}
              <span data-testid="import-current-position">
                {current.position} / {total}
              </span>{' '}
              — <span data-testid="import-current-title">{current.title}</span>
            </Typography>
            {current.reference && (
              <Typography className="text-sm text-(--color-typography-secondary)">
                <TranslatedContent content="bulkImport.identifier" />: {current.reference}
              </Typography>
            )}
            <Typography className="text-sm">
              <TranslatedContent content="bulkImport.stageLabel" />:{' '}
              <span data-testid="import-current-stage">
                <TranslatedContent content={stage ? STAGE_LABEL_KEY[stage] : 'bulkImport.stage.work'} />
              </span>
              {stage === 'chapters' && current.chapterCount > 0 && (
                <>
                  {' '}
                  (<span data-testid="import-chapter-count">{current.chapterCount}</span>)
                </>
              )}
            </Typography>
          </>
        ) : (
          <Typography>
            <TranslatedContent content="bulkImport.running.starting" />
          </Typography>
        )}

        <Typography className="text-sm">
          <span data-testid="import-remaining">{remaining}</span>{' '}
          <TranslatedContent content="bulkImport.running.remaining" />
        </Typography>
      </div>

      <Typography color="warning.main" className="text-sm">
        <TranslatedContent content="bulkImport.running.keepOpen" />
      </Typography>
    </section>
  );
};

type SuccessStateProps = {
  total: number;
  completed: number;
  onViewWorks: () => void;
};

const SuccessState = ({ total, completed, onViewWorks }: SuccessStateProps) => (
  <section
    role="alert"
    className="flex flex-col items-center gap-3 rounded border border-green-300 bg-green-50 p-4 text-green-900"
  >
    <Typography component="h2" fontWeight="bold" color="inherit">
      <TranslatedContent content="bulkImport.success.heading" />
    </Typography>
    <Typography color="inherit">
      <span data-testid="import-success-count">
        {completed} / {total}
      </span>{' '}
      <TranslatedContent content="bulkImport.success.processed" />
    </Typography>
    <Button variant="contained" color="primary" className="max-w-max capitalize" onClick={onViewWorks}>
      <TranslatedContent content="bulkImport.success.viewWorks" />
    </Button>
  </section>
);

type FailureStateProps = {
  state: Extract<ImportExecutionState, { phase: 'failed' }>;
};

const FailureState = ({ state }: FailureStateProps) => {
  const { source, failure, occurredAt } = state;
  const { total, completed, current, message } = failure;
  const notStarted = Math.max(total - current.position, 0);

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const report = buildImportErrorReport({ source, failure, timestamp: occurredAt });

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; leave the report on screen so it can still be copied by
      // hand, and do not claim success.
      setCopied(false);
    }
  };

  return (
    <section role="alert" className="flex flex-col gap-3 rounded border border-red-300 bg-red-50 p-4 text-red-900">
      <Typography component="h2" fontWeight="bold" color="inherit">
        <TranslatedContent content="bulkImport.failure.heading" />
      </Typography>

      <Typography color="inherit">
        <TranslatedContent content="bulkImport.failure.stoppedAt" />{' '}
        <span data-testid="import-failure-position">
          {current.position} / {total}
        </span>{' '}
        — <span data-testid="import-failure-title">{current.title}</span>
      </Typography>

      {current.reference && (
        <Typography color="inherit" className="text-sm">
          <TranslatedContent content="bulkImport.identifier" />: {current.reference}
        </Typography>
      )}

      <Typography color="inherit" className="text-sm">
        <TranslatedContent content="bulkImport.stageLabel" />:{' '}
        <TranslatedContent content={STAGE_LABEL_KEY[failure.stage]} />
      </Typography>

      <Typography color="inherit" className="text-sm">
        <TranslatedContent content="bulkImport.failure.processedBefore" />:{' '}
        <span data-testid="import-failure-completed">{completed}</span>
        {' · '}
        <TranslatedContent content="bulkImport.failure.notStarted" />:{' '}
        <span data-testid="import-failure-not-started">{notStarted}</span>
      </Typography>

      <Typography color="inherit" className="text-sm break-words">
        <TranslatedContent content="bulkImport.failure.error" />:{' '}
        <span data-testid="import-failure-message">{message}</span>
      </Typography>

      {/*
        The truthful account of a non-atomic run: the book it stopped on may already be partly
        created, it was not rolled back, and running the same file again is not a safe retry.
      */}
      <Typography color="inherit" className="text-sm font-semibold">
        <TranslatedContent content="bulkImport.failure.partialWarning" />
      </Typography>

      <div className="flex items-center gap-3">
        <Button variant="outlined" color="primary" className="max-w-max capitalize" onClick={handleCopy}>
          <TranslatedContent content="bulkImport.failure.copyReport" />
        </Button>
        {copied && (
          <Typography color="inherit" className="text-sm" data-testid="import-copy-feedback">
            <TranslatedContent content="bulkImport.failure.copied" />
          </Typography>
        )}
      </div>
    </section>
  );
};
