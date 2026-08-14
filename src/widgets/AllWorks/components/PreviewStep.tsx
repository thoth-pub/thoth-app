import { useEffect } from 'react';

import { useImportPreflight } from '@/src/entities/work';
import type { ImportIssue, ImportPlan, ImportSource } from '@/src/shared/types';
import {
  Button,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { convertOptionToString, getDisplayTitle } from '@/src/shared/utils';

import { useBeforeUnloadGuard } from '../hooks/useBeforeUnloadGuard';
import { useBulkImportExecution } from '../hooks/useBulkImportExecution';
import { ImportExecutionStatus } from './ImportExecutionStatus';
import { ImportPreflightReport } from './ImportPreflightReport';

/** Stable identity, so a preview with nothing to warn about does not re-render on every pass. */
const NO_WARNINGS: ImportIssue[] = [];

type PreviewStepProps = {
  /**
   * The final resolved plan — the parser's, with any contributor choices the user made already
   * applied — and exactly what confirming will create.
   */
  plan: ImportPlan;
  /**
   * What the source file said that this import will not represent. Never fatal, and never part
   * of the payload: the preview is where they are shown, because it is the last point at which
   * the user can decide not to go ahead.
   */
  warnings?: ImportIssue[];
  /**
   * Where the plan came from — importer type and filename. Held for the running display and the
   * copyable failure report; carries no file contents and never reaches the API. Null only before
   * a file has been parsed, when the preview is not on screen.
   */
  source: ImportSource | null;
  /** Acknowledge a finished import: continue to the Works list and close the modal. */
  onSubmit: () => void;
  /**
   * Told whenever the import starts and stops running, so the modal can refuse to be dismissed
   * while a non-atomic run is in flight.
   */
  onRunningChange?: (running: boolean) => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { plan, warnings = NO_WARNINGS, source, onSubmit, onRunningChange } = props;
  const { works, chapters, series } = plan;

  // Runtime execution state, kept apart from the plan: the plan is what to create, this is what
  // is happening to it. The observer it installs only reports; it changes nothing about the run.
  const { state, runImport } = useBulkImportExecution();
  const isRunning = state.phase === 'running';
  const hasStarted = state.phase !== 'idle';

  // Only while a run is actually in flight: a refresh or tab close then risks cutting it off
  // partway. Removed the moment it succeeds, fails, or the preview unmounts.
  useBeforeUnloadGuard(isRunning);

  // Keeps the parent's lock in step with the run for everything after the start: it clears the
  // lock the moment the run reaches a terminal state (success or failure), and clears it on
  // unmount too, so a lock can never outlive the run. The *start* of the lock is not left to this
  // effect — that would only fire after the running UI had already committed and painted, leaving
  // a frame in which the import is running but the modal is still dismissible. `handleCreate`
  // below closes that window by locking synchronously with the click; this reaffirms it and owns
  // the unlock.
  useEffect(() => {
    onRunningChange?.(isRunning);

    return () => onRunningChange?.(false);
  }, [isRunning, onRunningChange]);

  // The preflight runs against the plan as it now stands, so the report describes exactly what
  // the button below would create. It reads Thoth and changes nothing; its findings are shown,
  // never applied, and the plan is untouched by it either way.
  const {
    report: preflightReport,
    isChecking: isCheckingDuplicates,
    hasFailed: preflightFailed,
    retry: retryPreflight,
  } = useImportPreflight(plan);

  // Starting the import replaces this whole preview with the execution status below, so a second
  // press has nothing to press. The run is awaited inside the hook, which resolves the rejection
  // itself: the preview stays on screen on failure, and no unhandled rejection escapes.
  //
  // A failed import is not offered a retry from here. The plan was built against the series Thoth
  // had before the attempt, so re-running it could create a series — and every work — a second
  // time. The failure report says as much; resolving a partial import is a manual step.
  const handleCreate = () => {
    if (!source) return;

    // Lock the modal in the same tick as the click, before the run is even kicked off. This
    // batches with the reducer's move to `running`, so the parent commits its non-dismissible
    // state in the same render that first shows the running UI — the import can never be seen
    // running while the modal is still dismissible. The effect above then owns the unlock.
    onRunningChange?.(true);

    void runImport(plan, source);
  };

  // A work belongs to at most one planned series, so a flat lookup is enough. Membership is by
  // work id, so this reads the plan's own works rather than a copy the series kept. Works headed
  // for a series the import will have to create are labelled, so confirming is an informed
  // choice.
  const seriesByWorkId = new Map(
    series.flatMap((group) =>
      group.members.map(
        ({ workId }) => [workId, { name: group.name, isNew: group.target.kind === 'proposed' }] as const,
      ),
    ),
  );

  // Once the run has begun, the preview gives way to a single, persistent account of it: running,
  // then either the success summary (acknowledged before navigating) or the failure report. There
  // is deliberately no path back to the Create button from a terminal state.
  if (hasStarted) {
    return <ImportExecutionStatus state={state} plan={plan} onViewWorks={onSubmit} />;
  }

  return (
    <>
      {/*
        The report of what this plan would create, and what about it looks like it might already
        exist. Kept separate from the warnings below: a warning is something the file said that
        the import cannot represent, a duplicate signal is a comparison against other records,
        and reading one as the other would misdescribe both.
      */}
      <ImportPreflightReport
        report={preflightReport}
        isChecking={isCheckingDuplicates}
        hasFailed={preflightFailed}
        warningCount={warnings.length}
        onRetry={retryPreflight}
      />
      {/*
        Shown above the works so they are read before the list is scanned, and kept out of the
        execution channel below: nothing here stops the import, and the Create button stays
        enabled. Order is the parser's, which is source-file order.
      */}
      {warnings.length > 0 && (
        <section className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <Typography component="h2" fontWeight="bold" color="inherit" className="capitalize">
            <TranslatedContent content="warnings" />
          </Typography>
          <ul className="list-disc pl-5">
            {warnings.map((warning, index) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- static warning list, regenerated wholesale on each parse; messages may repeat
              <li key={index}>
                <Typography component="span" color="inherit">
                  {warning.message}
                </Typography>
              </li>
            ))}
          </ul>
        </section>
      )}
      <TableWrapper>
        <TableHeader
          cells={['title', 'status', 'type', 'contributors', 'doi', 'series']}
          cellStyles={['pl-4 capitalize', 'capitalize', 'capitalize', 'capitalize', 'capitalize', 'capitalize']}
        />
        <TableBody>
          {works.map((work) => {
            const title = getDisplayTitle(work.titles);
            const series = seriesByWorkId.get(work.id);

            return (
              <TableRow key={work.id}>
                <TableCell className="pl-4">{title.title}</TableCell>
                <TableCell>{convertOptionToString(work.status)}</TableCell>
                <TableCell>{convertOptionToString(work.type)}</TableCell>
                <TableCell>{work.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{work.doi}</TableCell>
                <TableCell>
                  {series && (
                    <>
                      {series.name}
                      {series.isNew && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs whitespace-nowrap text-amber-900">
                          <TranslatedContent content="will be created" />
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {chapters.map((chapter) => {
            const title = getDisplayTitle(chapter.titles);
            return (
              <TableRow key={chapter.id}>
                <TableCell>{title.title}</TableCell>
                <TableCell>{convertOptionToString(chapter.status)}</TableCell>
                <TableCell>{convertOptionToString(chapter.type)}</TableCell>
                <TableCell>{chapter.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{chapter.doi}</TableCell>
                <TableCell />
              </TableRow>
            );
          })}
        </TableBody>
      </TableWrapper>
      {/*
        Confirmation waits for the preflight, and for nothing else it found. Creating before the
        check has answered would show the user a report about an import they had already run, and
        creating when the check could not run at all would let a claim of "nothing found" stand
        for a question that was never asked.
        Duplicate findings themselves never disable this. They are signals, and whether they mean
        two records are the same work is the user's call — there is deliberately no acknowledgement
        to tick and no row to remove first.
      */}
      <Button
        variant="contained"
        color="primary"
        className="m-auto max-w-max capitalize"
        onClick={handleCreate}
        disabled={isCheckingDuplicates || preflightFailed}
      >
        <TranslatedContent content="actions.create" />
      </Button>
    </>
  );
};
