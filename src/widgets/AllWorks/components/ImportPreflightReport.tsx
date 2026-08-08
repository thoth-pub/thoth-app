import type { ImportDuplicateFinding, ImportPreflightReport as ImportPreflightReportType } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';

/**
 * The preflight's findings, shown at the confirmation boundary.
 *
 * Everything here is descriptive. A finding says two records carry the same identifier, and
 * stops there: the wording never claims the records are the same work, never offers to merge or
 * skip anything, and never stands between the user and the Create button. Deciding is the user's,
 * and in this stage the only outcomes are "create anyway" and "close the upload".
 *
 * The coverage line is not filler either. This check reads DOIs and ISBNs and nothing else, so a
 * clean result has to be stated as "no matching DOI or ISBN was found" and paired with how many
 * works had neither to check.
 */

type ImportPreflightReportProps = {
  report: ImportPreflightReportType | null;
  isChecking: boolean;
  hasFailed: boolean;
  /** Parser warnings, counted for the summary. They stay in their own section — see PreviewStep. */
  warningCount: number;
  onRetry: () => void;
};

const SummaryFigure = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col">
    <Typography component="span" variant="h2" fontWeight="bold">
      {value}
    </Typography>
    <Typography component="span" variant="caption">
      <TranslatedContent content={label} />
    </Typography>
  </div>
);

/**
 * Why this identifier is worth a second look, in the user's terms.
 *
 * Both reasons can be true at once: an identifier can repeat inside the upload *and* already
 * exist in Thoth, and saying only one of those would understate what was found.
 */
const FindingReasons = ({ finding }: { finding: ImportDuplicateFinding }) => {
  const { basis, importedWorks, existingWorks } = finding;

  return (
    <ul className="list-disc pl-5">
      {importedWorks.length > 1 && (
        <li>
          <Typography component="span" color="inherit">
            <TranslatedContent
              content={basis === 'doi' ? 'importPreflight.doiRepeatedInUpload' : 'importPreflight.isbnRepeatedInUpload'}
            />
          </Typography>
        </li>
      )}
      {existingWorks.length > 0 && (
        <li>
          <Typography component="span" color="inherit">
            <TranslatedContent
              content={basis === 'doi' ? 'importPreflight.doiAlsoInThoth' : 'importPreflight.isbnAlsoInThoth'}
            />
          </Typography>
        </li>
      )}
    </ul>
  );
};

const Finding = ({ finding }: { finding: ImportDuplicateFinding }) => {
  const { basis, value, importedWorks, existingWorks } = finding;

  return (
    <li className="rounded border border-amber-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs whitespace-nowrap text-amber-900">
          <TranslatedContent content={basis === 'doi' ? 'importPreflight.sameDoi' : 'importPreflight.sameIsbn'} />
        </span>
        <Typography component="span" fontWeight="bold" color="inherit">
          {value}
        </Typography>
      </div>
      <FindingReasons finding={finding} />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-8">
        <div>
          <Typography component="h4" variant="caption" color="inherit" fontWeight="bold">
            <TranslatedContent content="importPreflight.inThisUpload" />
          </Typography>
          <ul>
            {importedWorks.map((work) => (
              <li key={work.workId}>
                <Typography component="span" color="inherit">
                  {work.title}{' '}
                  <Typography component="span" variant="caption" color="inherit">
                    #{work.importIndex + 1}
                  </Typography>
                </Typography>
              </li>
            ))}
          </ul>
        </div>
        {/*
          Every existing match is listed. Several existing works sharing one identifier is a
          thing the user needs to see, not a tie for this code to break by picking a winner.
        */}
        {existingWorks.length > 0 && (
          <div>
            <Typography component="h4" variant="caption" color="inherit" fontWeight="bold">
              <TranslatedContent content="importPreflight.alreadyInThoth" />
            </Typography>
            <ul>
              {existingWorks.map((work) => (
                <li key={work.workId}>
                  <Typography component="span" color="inherit">
                    {work.title}
                    {work.doi.length > 0 && (
                      <Typography component="span" variant="caption" color="inherit">
                        {' '}
                        {work.doi}
                      </Typography>
                    )}
                    {work.isbns.length > 0 && (
                      <Typography component="span" variant="caption" color="inherit">
                        {' '}
                        {work.isbns.join(', ')}
                      </Typography>
                    )}
                  </Typography>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
};

export const ImportPreflightReport = (props: ImportPreflightReportProps) => {
  const { report, isChecking, hasFailed, warningCount, onRetry } = props;

  if (hasFailed) {
    return (
      <section className="flex flex-col items-start gap-2 rounded border border-red-300 bg-red-50 p-4 text-red-900">
        <Typography component="h2" fontWeight="bold" color="inherit">
          <TranslatedContent content="importPreflight.failedTitle" />
        </Typography>
        {/*
          A failure of the check, not of the file: nothing is wrong with what was uploaded, so
          this is not a parser issue and does not join the warnings. The lookups are reads, so
          asking again is safe — unlike retrying a bulk creation, which is not offered.
        */}
        <Typography color="inherit">
          <TranslatedContent content="importPreflight.failed" />
        </Typography>
        <Button variant="outlined" color="inherit" className="capitalize" onClick={onRetry}>
          <TranslatedContent content="importPreflight.retry" />
        </Button>
      </section>
    );
  }

  if (isChecking || report === null) {
    return (
      <section className="rounded border border-slate-200 bg-slate-50 p-4">
        <Typography>
          <TranslatedContent content="importPreflight.checking" />
        </Typography>
      </section>
    );
  }

  const { summary, duplicateFindings } = report;

  return (
    <>
      <section className="flex flex-col gap-3 rounded border border-slate-200 bg-slate-50 p-4">
        <Typography component="h2" fontWeight="bold" className="capitalize">
          <TranslatedContent content="importPreflight.summary" />
        </Typography>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <SummaryFigure label="importPreflight.worksToCreate" value={summary.works} />
          <SummaryFigure label="importPreflight.chaptersToCreate" value={summary.chapters} />
          <SummaryFigure label="importPreflight.existingSeriesJoined" value={summary.existingSeries} />
          <SummaryFigure label="importPreflight.seriesToCreate" value={summary.proposedSeries} />
          <SummaryFigure label="importPreflight.warningCount" value={warningCount} />
          <SummaryFigure label="importPreflight.affectedWorks" value={summary.affectedWorks} />
          <SummaryFigure label="importPreflight.findingCount" value={summary.duplicateFindings} />
        </div>
        {/*
          What was actually checked, always shown. Without it, "no potential duplicates" reads as
          "no duplicates", which this check is in no position to claim.
        */}
        <Typography variant="body2">
          <TranslatedContent
            content="importPreflight.coverage"
            options={{
              checked: summary.worksWithAnyCheckedIdentifier,
              total: summary.works,
              unchecked: summary.worksWithoutCheckedIdentifier,
              withDoi: summary.worksWithDoi,
              withIsbn: summary.worksWithIsbn,
            }}
          />
        </Typography>
        {duplicateFindings.length === 0 && (
          <Typography variant="body2">
            <TranslatedContent content="importPreflight.noFindings" />
          </Typography>
        )}
        <Typography variant="caption">
          <TranslatedContent content="importPreflight.scope" />
        </Typography>
      </section>
      {duplicateFindings.length > 0 && (
        <section className="flex flex-col gap-3 rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <Typography component="h2" fontWeight="bold" color="inherit">
            <TranslatedContent content="importPreflight.potentialDuplicates" />
          </Typography>
          {/* Findings do not block: the button below stays enabled, and this says so plainly. */}
          <Typography color="inherit" variant="body2">
            <TranslatedContent content="importPreflight.findingsAreAdvisory" />
          </Typography>
          <ul className="flex flex-col gap-2">
            {duplicateFindings.map((finding) => (
              <Finding key={`${finding.basis}:${finding.value}`} finding={finding} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
};
