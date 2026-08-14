'use client';

import { useId, useMemo, useState } from 'react';

import type { ImportExecutionStage, ImportPlan, ImportSource } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';

import type { ImportExecutionState } from '../hooks/useBulkImportExecution';
import { downloadTextFile } from '../lib/downloadTextFile';
import { deriveImportLedger, type ImportLedgerEntry } from '../lib/importLedger';
import { buildImportReport, importReportFilename } from '../lib/importReport';
import { ImportLedger } from './ImportLedger';

type ImportExecutionStatusProps = {
  state: ImportExecutionState;
  /**
   * The confirmed plan, read only to derive the session ledger. It is never mutated here — the
   * ledger is a receipt derived from the plan and the execution truth, not stored back into it.
   */
  plan: ImportPlan;
  /** Acknowledge a finished import and continue to the Works list. */
  onViewWorks: () => void;
};

const STAGE_LABEL_KEY: Record<ImportExecutionStage, string> = {
  work: 'bulkImport.stage.work',
  chapters: 'bulkImport.stage.chapters',
  series: 'bulkImport.stage.series',
};

/**
 * The persistent, in-modal report of an import once it has started. It renders exactly one of the
 * running, succeeded, or failed states and nothing at all while idle, so the modal never shows two
 * accounts of the same run at once.
 *
 * Every state announces itself to assistive technology — the running state through a polite live
 * region and a labelled progress bar, the terminal states through an alert — so progress and
 * failure are never conveyed by colour or position alone. Alongside the live summary, each state
 * carries the ordered per-book ledger as static, browsable table content; the terminal states also
 * expose the complete session report to copy or download.
 */
export const ImportExecutionStatus = ({ state, plan, onViewWorks }: ImportExecutionStatusProps) => {
  // Derived from the plan and the current execution truth on every render. `deriveImportLedger` is
  // pure and leaves the plan untouched: this is a read of it, never a write back into it.
  const ledger = useMemo(() => deriveImportLedger(plan, state), [plan, state]);

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
        ledger={ledger}
      />
    );
  }

  if (state.phase === 'succeeded') {
    return (
      <SuccessState
        total={state.summary.total}
        completed={state.summary.completed}
        source={state.source}
        timestamp={state.occurredAt}
        ledger={ledger}
        onViewWorks={onViewWorks}
      />
    );
  }

  if (state.phase === 'failed') {
    return <FailureState state={state} ledger={ledger} />;
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
  ledger: ImportLedgerEntry[];
};

const RunningState = ({ total, completed, percent, remaining, current, stage, ledger }: RunningStateProps) => {
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
        The ledger below is deliberately outside it — static table content, not something to
        re-announce whole on every stage change.
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

      <ImportLedger entries={ledger} />
    </section>
  );
};

type SuccessStateProps = {
  total: number;
  completed: number;
  source: ImportSource;
  timestamp: string;
  ledger: ImportLedgerEntry[];
  onViewWorks: () => void;
};

const SuccessState = ({ total, completed, source, timestamp, ledger, onViewWorks }: SuccessStateProps) => (
  <div className="flex flex-col gap-3">
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
    </section>

    <ImportLedger entries={ledger} />

    <div className="flex flex-wrap items-center gap-3">
      <ImportReportActions source={source} timestamp={timestamp} ledger={ledger} />
      <Button variant="contained" color="primary" className="max-w-max capitalize" onClick={onViewWorks}>
        <TranslatedContent content="bulkImport.success.viewWorks" />
      </Button>
    </div>
  </div>
);

type FailureStateProps = {
  state: Extract<ImportExecutionState, { phase: 'failed' }>;
  ledger: ImportLedgerEntry[];
};

const FailureState = ({ state, ledger }: FailureStateProps) => {
  const { source, failure, occurredAt } = state;
  const { total, completed, current, message } = failure;
  const notStarted = Math.max(total - current.position, 0);

  return (
    <div className="flex flex-col gap-3">
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
      </section>

      <ImportLedger entries={ledger} />

      <ImportReportActions source={source} timestamp={occurredAt} ledger={ledger} failureMessage={message} />
    </div>
  );
};

type ImportReportActionsProps = {
  source: ImportSource;
  timestamp: string;
  ledger: ImportLedgerEntry[];
  /** Present only for a stopped run, so the report includes the original error and partial warning. */
  failureMessage?: string;
};

/**
 * Copy and Download for the complete session report, offered by both terminal states.
 *
 * Both actions build their text from the very same {@link buildImportReport} call, so the copied
 * and downloaded reports can never drift. Copy reflects a denied clipboard honestly — it does not
 * claim success it did not get — and neither action touches the run: they are pure reads of the
 * ledger the modal already holds.
 */
const ImportReportActions = ({ source, timestamp, ledger, failureMessage }: ImportReportActionsProps) => {
  const [copied, setCopied] = useState(false);

  const buildReport = () =>
    buildImportReport({ source, timestamp, ledger, failure: failureMessage ? { message: failureMessage } : undefined });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
    } catch {
      // Clipboard access can be denied; leave the report available to download by hand, and do
      // not claim success.
      setCopied(false);
    }
  };

  const handleDownload = () => {
    downloadTextFile(importReportFilename(source, timestamp), buildReport());
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outlined" color="primary" className="max-w-max capitalize" onClick={handleCopy}>
        <TranslatedContent content="bulkImport.report.copy" />
      </Button>
      <Button variant="outlined" color="primary" className="max-w-max capitalize" onClick={handleDownload}>
        <TranslatedContent content="bulkImport.report.download" />
      </Button>
      {copied && (
        <Typography className="text-sm" data-testid="import-copy-feedback">
          <TranslatedContent content="bulkImport.report.copied" />
        </Typography>
      )}
    </div>
  );
};
