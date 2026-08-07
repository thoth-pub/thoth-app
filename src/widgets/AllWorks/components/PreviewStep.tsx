import { useState, useTransition } from 'react';

import { useBulkCreateWorks, useImportPreflight } from '@/src/entities/work';
import type { ImportIssue, ImportPlan } from '@/src/shared/types';
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
  onSubmit: () => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { plan, warnings = NO_WARNINGS, onSubmit } = props;
  const { works, chapters, series } = plan;

  const { bulkCreateWorks } = useBulkCreateWorks();
  const [isPending, startTransition] = useTransition();
  const [hasFailed, setHasFailed] = useState(false);

  // The preflight runs against the plan as it now stands, so the report describes exactly what
  // the button below would create. It reads Thoth and changes nothing; its findings are shown,
  // never applied, and the plan is untouched by it either way.
  const {
    report: preflightReport,
    isChecking: isCheckingDuplicates,
    hasFailed: preflightFailed,
    retry: retryPreflight,
  } = useImportPreflight(plan);

  // The import is awaited so the preview stays on screen while it runs, and stays on screen if
  // it fails: a bulk import is not atomic, so navigating away on failure would leave the user
  // with no idea what was created. The error notification is raised by useBulkCreateWorks;
  // rethrowing here would surface as an unhandled rejection.
  //
  // A failed import cannot be retried from this screen. The plan was built against the series
  // Thoth had before the attempt, so a group still marked `proposed` may name a series the
  // failed run already created — confirming again would create it a second time.
  //
  // Re-uploading is not a safe retry either, and the message deliberately does not offer it as
  // one. A fresh parse does resolve an already-created series to `existing`, but bulkCreateWorks
  // calls createWork unconditionally and Thoth does not deduplicate works, so every work the
  // failed run managed to create would be created again. The user has to inspect the Works list
  // and resolve the partial import themselves.
  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await bulkCreateWorks(plan);
      } catch {
        setHasFailed(true);

        return;
      }

      onSubmit();
    });
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
        `hasFailed` channel below: nothing here stops the import, and the Create button stays
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
      {hasFailed && (
        <Typography color="error" className="text-center">
          <TranslatedContent content="bulk import did not finish" />
        </Typography>
      )}
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
        onClick={handleSubmit}
        disabled={isPending || hasFailed || isCheckingDuplicates || preflightFailed}
      >
        <TranslatedContent content="actions.create" />
      </Button>
    </>
  );
};
