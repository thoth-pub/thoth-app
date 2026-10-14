'use client';

import { useId, useMemo, useState } from 'react';

import type {
  ImportCleanupDisposition,
  ImportCleanupOperation,
  ImportExecutionStage,
  ImportPlan,
  ImportSource,
} from '@/src/shared/types';
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
  noop: 'bulkImport.stage.noop',
  work: 'bulkImport.stage.work',
  publication: 'bulkImport.stage.publication',
  chapters: 'bulkImport.stage.chapters',
  chapter: 'bulkImport.stage.chapters',
  containedWork: 'bulkImport.stage.containedWork',
  additionalResource: 'bulkImport.stage.additionalResource',
  bookReview: 'bulkImport.stage.bookReview',
  endorsement: 'bulkImport.stage.endorsement',
  award: 'bulkImport.stage.award',
  series: 'bulkImport.stage.series',
  relation: 'bulkImport.stage.relation',
};

const CLEANUP_OPERATION_KEY: Record<ImportCleanupOperation, string> = {
  DELETE_WORK: 'bulkImport.cleanup.operation.DELETE_WORK',
  DELETE_PUBLICATION: 'bulkImport.cleanup.operation.DELETE_PUBLICATION',
  DELETE_WORK_RELATION: 'bulkImport.cleanup.operation.DELETE_WORK_RELATION',
  DELETE_ADDITIONAL_RESOURCE: 'bulkImport.cleanup.operation.DELETE_ADDITIONAL_RESOURCE',
  DELETE_BOOK_REVIEW: 'bulkImport.cleanup.operation.DELETE_BOOK_REVIEW',
  DELETE_ENDORSEMENT: 'bulkImport.cleanup.operation.DELETE_ENDORSEMENT',
  DELETE_AWARD: 'bulkImport.cleanup.operation.DELETE_AWARD',
  CREATE_OUTCOME_UNKNOWN: 'bulkImport.cleanup.operation.CREATE_OUTCOME_UNKNOWN',
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
            {/*
              Normal body text: the secondary token is white, about 1.1:1 on this sand surface, while
              the typography token is about 16:1 (thoth-app#270).
            */}
            {current.reference && (
              <Typography className="text-sm text-(--color-typography)">
                <TranslatedContent content="bulkImport.identifier" />: {current.reference}
              </Typography>
            )}
            <Typography className="text-sm">
              <TranslatedContent content="bulkImport.stageLabel" />:{' '}
              <span data-testid="import-current-stage">
                <TranslatedContent content={stage ? STAGE_LABEL_KEY[stage] : 'bulkImport.stage.work'} />
              </span>
              {(stage === 'chapters' || stage === 'chapter') && current.chapterCount > 0 && (
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

      {/*
        Normal body text, not the pale warning palette: on the modal's sand surface warning.main is
        about 1.2:1, far below WCAG AA, while the typography token is about 16:1 (thoth-app#266).
      */}
      <Typography className="text-sm text-(--color-typography)">
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

        {failure.cleanup === undefined ? (
          /*
            The truthful account of a non-atomic CSV run: the book it stopped on may already be partly
            created, it was not rolled back, and running the same file again is not a safe retry.
          */
          <Typography color="inherit" className="text-sm font-semibold">
            <TranslatedContent content="bulkImport.failure.partialWarning" />
          </Typography>
        ) : (
          <CleanupOutcome cleanup={failure.cleanup} />
        )}
      </section>

      <ImportLedger entries={ledger} />

      <ImportReportActions
        source={source}
        timestamp={occurredAt}
        ledger={ledger}
        failure={
          failure.cleanup === undefined ? (message ? { message } : undefined) : { message, cleanup: failure.cleanup }
        }
      />
    </div>
  );
};

/**
 * What became of a stopped ONIX unit's own writes (thoth-app#187), apart from the stage it failed at, and what that
 * means for trying again: removed and proven removed, or never written - and the complete file may be uploaded again
 * through a fresh check - or not all proven removed, and it must be reconciled by hand first, write by write.
 */
const CleanupOutcome = ({ cleanup }: { cleanup: ImportCleanupDisposition }) => (
  <div className="flex flex-col gap-2" data-testid="import-cleanup" data-cleanup-status={cleanup.status}>
    <Typography color="inherit" className="text-sm font-semibold" data-testid="import-cleanup-status">
      <TranslatedContent content={`bulkImport.cleanup.status.${cleanup.status}`} />
    </Typography>
    {cleanup.status === 'VERIFIED' && (
      <Typography color="inherit" className="text-sm">
        <TranslatedContent content="bulkImport.cleanup.contributorResidue" />
      </Typography>
    )}
    {cleanup.status === 'FAILED_OR_UNKNOWN' && (
      <ul className="list-disc pl-5 text-sm" data-testid="import-cleanup-failures">
        {cleanup.failures.map(({ operation, entityId, actionKey, stage, reason }) => (
          <li key={`${operation}|${entityId ?? ''}|${actionKey}|${stage}`} className="break-words">
            <TranslatedContent content={CLEANUP_OPERATION_KEY[operation]} /> {entityId ?? ''} — {reason}
          </li>
        ))}
      </ul>
    )}
    <Typography color="inherit" className="text-sm font-semibold" data-testid="import-cleanup-retry">
      <TranslatedContent content={`bulkImport.cleanup.retry.${cleanup.retry}`} />
    </Typography>
  </div>
);

type ImportReportActionsProps = {
  source: ImportSource;
  timestamp: string;
  ledger: ImportLedgerEntry[];
  /**
   * Present only for a stopped run, so the report includes the original error and, for a CSV run, the partial warning,
   * or, for an ONIX run, the failed unit's cleanup and what it means for trying again.
   */
  failure?: { message: string; cleanup?: ImportCleanupDisposition };
};

/**
 * Copy and Download for the complete session report, offered by both terminal states.
 *
 * Both actions build their text from the very same {@link buildImportReport} call, so the copied
 * and downloaded reports can never drift. Copy reflects a denied clipboard honestly — it does not
 * claim success it did not get — and neither action touches the run: they are pure reads of the
 * ledger the modal already holds.
 */
const ImportReportActions = ({ source, timestamp, ledger, failure }: ImportReportActionsProps) => {
  const [copied, setCopied] = useState(false);

  const buildReport = () => buildImportReport({ source, timestamp, ledger, failure });

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
