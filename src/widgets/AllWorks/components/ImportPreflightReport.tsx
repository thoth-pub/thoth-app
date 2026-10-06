import type { ImportDuplicateFinding, ImportPreflightReport as ImportPreflightReportType } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';

import { ImportPhaseStatus } from './ImportPhaseStatus';
import { OnixIssueSummary } from './OnixIssueSummary';

/**
 * The final confirmation preflight.
 *
 * CSV keeps the original advisory DOI/ISBN comparison against the active publisher. ONIX is different: target identity
 * has already been resolved before its immutable plan exists, so this screen consumes that exact sidecar and never asks
 * Thoth the same identity question again. An internal identifier collision, residual blocker or non-executable ONIX
 * sidecar is therefore a fail-closed contract defect, not an advisory duplicate signal.
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


const FindingLocation = ({
  path,
  sourcePath,
}: {
  path: string;
  sourcePath: string;
}) => (
  <li className="break-all">
    <Typography component="span" variant="caption">
      {sourcePath === path ? path : `${sourcePath} -> ${path}`}
    </Typography>
  </li>
);

const OnixAggregate = ({ report }: { report: ImportPreflightReportType }) => {
  const { onix, blockingDuplicateFindings } = report;

  if (onix === null) return null;

  const findings = onix.findings ?? [];
  const existingGroups = onix.workGroups.filter(({ target }) => target === 'EXISTING_WORK');
  const existingProducts = onix.products.filter(({ action }) => action === 'ALREADY_PRESENT');

  return (
    <>
      <section
        data-testid="onix-preflight-contract"
        className={`flex flex-col gap-3 rounded border p-4 ${
          report.ready ? 'border-slate-200 bg-slate-50' : 'border-red-300 bg-red-50 text-red-900'
        }`}
      >
        <Typography component="h2" fontWeight="bold" color="inherit">
          <TranslatedContent content="importPreflight.onixSummary" />
        </Typography>
        <Typography color="inherit" data-testid="onix-preflight-status">
          <TranslatedContent content={report.ready ? 'importPreflight.onixReady' : 'importPreflight.onixBlocked'} />
        </Typography>
        <Typography variant="body2" color="inherit">
          <TranslatedContent
            content="importPreflight.onixCoverage"
            options={{
              issues: onix.issues.length,
              findings: findings.length,
              existing: existingGroups.length,
              present: existingProducts.length,
            }}
          />
        </Typography>
        <Typography variant="caption" color="inherit">
          <TranslatedContent content="importPreflight.onixExecutionBoundary" />
        </Typography>
      </section>

      {onix.issues.length > 0 && (
        <OnixIssueSummary issues={onix.issues} heading="importPreflight.onixSourceIssues" />
      )}

      <details data-testid="onix-preflight-findings">
        <summary>
          <Typography component="span" fontWeight="bold">
            <TranslatedContent content="importPreflight.onixTargetFindings" options={{ count: findings.length }} />
          </Typography>
        </summary>
        {findings.length === 0 ? (
          <Typography variant="body2">
            <TranslatedContent content="importPreflight.onixNoTargetFindings" />
          </Typography>
        ) : (
          <ol className="mt-2 flex list-decimal flex-col gap-3 pl-6">
            {findings.map((finding) => (
              <li key={finding.key}>
                <Typography component="div">
                  <strong>{finding.family}</strong> / {finding.classification}: {finding.message}
                </Typography>
                <Typography variant="caption" component="div">
                  <TranslatedContent content="importPreflight.onixAnswer" />: {finding.answer.state}
                  {finding.answer.state === 'ANSWERED' || finding.answer.state === 'REJECTED'
                    ? ` (${finding.answer.value})`
                    : ''}{' '}
                  / {finding.resolution.kind}
                </Typography>
                {Object.keys(finding.detail).length > 0 && (
                  <Typography variant="caption" component="div" className="break-all">
                    {JSON.stringify(finding.detail)}
                  </Typography>
                )}
                {finding.locations.length > 0 && (
                  <ul className="list-disc pl-5">
                    {finding.locations.map((location) => (
                      <FindingLocation
                        key={`${location.sourcePath}|${location.path}`}
                        path={location.path}
                        sourcePath={location.sourcePath}
                      />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </details>

      <details data-testid="onix-preflight-existing">
        <summary>
          <Typography component="span" fontWeight="bold">
            <TranslatedContent content="importPreflight.onixExistingTargets" />
          </Typography>
        </summary>
        {onix.workGroups.length === 0 && onix.products.length === 0 ? (
          <Typography variant="body2">
            <TranslatedContent content="importPreflight.onixNoExistingTargets" />
          </Typography>
        ) : (
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-6">
            {onix.workGroups.map((group) => (
              <li key={group.groupKey}>
                <Typography variant="body2">
                  {group.groupKey}: {group.target}
                  {group.existingWorkId === null ? '' : ` (${group.existingWorkId})`}
                </Typography>
              </li>
            ))}
            {onix.products.map((product) => (
              <li key={product.productKey}>
                <Typography variant="body2">
                  {product.productKey}: {product.action}
                </Typography>
              </li>
            ))}
          </ul>
        )}
      </details>

      {onix.blockers.length > 0 && (
        <section data-testid="onix-preflight-blockers" className="rounded border border-red-300 bg-red-50 p-4 text-red-900">
          <Typography component="h2" fontWeight="bold" color="inherit">
            <TranslatedContent content="importPreflight.onixBlockers" options={{ count: onix.blockers.length }} />
          </Typography>
          <ul className="list-disc pl-5">
            {onix.blockers.map((blocker, index) => (
              <li
                key={[
                  blocker.code,
                  blocker.recordKey,
                  blocker.productKey,
                  blocker.groupKey,
                  blocker.paths.join('|'),
                  index,
                ].join(':')}
              >
                <Typography color="inherit">
                  {blocker.code} / {blocker.classification}
                </Typography>
                {blocker.paths.length > 0 && (
                  <Typography variant="caption" color="inherit" className="break-all">
                    {blocker.paths.join(', ')}
                  </Typography>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {blockingDuplicateFindings.length > 0 && (
        <section
          data-testid="onix-preflight-identifier-conflicts"
          className="flex flex-col gap-3 rounded border border-red-300 bg-red-50 p-4 text-red-900"
        >
          <Typography component="h2" fontWeight="bold" color="inherit">
            <TranslatedContent content="importPreflight.onixUnexpectedDuplicates" />
          </Typography>
          <Typography color="inherit" variant="body2">
            <TranslatedContent content="importPreflight.onixUnexpectedDuplicatesBody" />
          </Typography>
          <ul className="flex flex-col gap-2">
            {blockingDuplicateFindings.map((finding) => (
              <Finding key={`${finding.basis}:${finding.value}`} finding={finding} />
            ))}
          </ul>
        </section>
      )}
    </>
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
    // The duplicate check is real background work, so it joins the shared phase/status language
    // rather than sitting behind a bare spinner. It stays a read-only signal: nothing about the
    // findings or the failure/retry behaviour below changes.
    return <ImportPhaseStatus content="importPreflight.checking" data-testid="import-phase-preflight" />;
  }

  const { summary, duplicateFindings, onix } = report;

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
        {onix === null ? (
          <>
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
          </>
        ) : (
          <Typography variant="body2">
            <TranslatedContent content="importPreflight.onixIdentifierScope" />
          </Typography>
        )}
      </section>
      <OnixAggregate report={report} />
      {onix === null && duplicateFindings.length > 0 && (
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
