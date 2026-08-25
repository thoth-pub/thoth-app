'use client';

import type { GetPublisherServiceConfigurationReportQuery } from '@/gql/graphql';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  Button,
  Chip,
  ContentSection,
  Pagination,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

import PublisherAdministrationEditor from './PublisherAdministrationEditor';
import PublisherAdministrationHeader from './PublisherAdministrationHeader';
import usePublisherAdministration from './usePublisherAdministration';

type ReportSummary = GetPublisherServiceConfigurationReportQuery['publisherServiceConfigurations'][number];

// APP-02A: consolidated superuser publisher administration index.
//
// Every presented fact is an API fact from the one paginated report read: row
// identity and name come from `configuration.publisher`, the package is the
// exact `subscriptionPackage`, platform membership comes only from
// `enabledDistributionPlatforms` (option metadata supplies display labels and
// nothing else), the latest job is shown exactly as reported (a null job means
// only that no back-catalogue job is recorded, and a report error is shown as
// unavailable, never as "no job"), and the last configuration change comes only
// from `lastChange`.
//
// APP-02B adds exactly one bounded write affordance: a per-row Edit that opens
// the focused single-publisher service-configuration editor. It carries the
// row's own summary - and therefore that row's publisher ID, package, platform
// set and version token - into the edit session; it never switches, reads or
// depends on the global active publisher. At most one row's editor is open at a
// time, and every Edit control is withheld while a session or a save is
// outstanding.
const PublisherAdministration = () => {
  const {
    viewState,
    summaries,
    countError,
    totalPagesCount,
    activePage,
    changePage,
    selectedPublisherIds,
    changeSelectedPublisherIds,
    selectedPackages,
    changeSelectedPackages,
    selectedPlatforms,
    changeSelectedPlatforms,
    selectedJobStatuses,
    changeSelectedJobStatuses,
    jobPresence,
    changeJobPresence,
    publisherFilterOptions,
    packageFilterOptions,
    platformFilterOptions,
    jobStatusFilterOptions,
    getPlatformDisplayLabel,
    editSession,
    editPlatformRows,
    isSavingEdit,
    canStartEdit,
    canCancelEdit,
    saveOutcome,
    startEdit,
    cancelEdit,
    changeEditPackage,
    toggleEditPlatform,
    saveEdit,
  } = usePublisherAdministration();

  // Each row's Edit control gets an accessible name that identifies the exact
  // publisher it edits, so the affordance is never ambiguous between rows.
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.publishers });
  const editActionLabel = t('editAction');

  // User identity is not authoritative yet: nothing staff-only is presented and
  // no report request has been started.
  if (viewState === 'identityPending') {
    return (
      <ContentSection>
        <Skeleton variant="rounded" height={96} />
      </ContentSection>
    );
  }

  // Authoritative non-superuser: bounded fail-closed presentation. No report or
  // count request was executed and no staff report data exists to expose.
  if (viewState === 'notAuthorized') {
    return (
      <ContentSection>
        <Typography>
          <TranslatedContent content="notAuthorized" namespace={NAMESPACES.enum.publishers} />
        </Typography>
      </ContentSection>
    );
  }

  const renderLatestJobCell = (summary: ReportSummary) => {
    const latestJob = summary.latestBackCatalogueJob;

    // A valid summary with a null job means only that no back-catalogue
    // onboarding job is recorded - no success, failure, requirement or
    // dissemination state is implied or displayed.
    if (!latestJob) {
      return (
        <Typography variant="body2">
          <TranslatedContent content="noBackCatalogueJobRecorded" namespace={NAMESPACES.enum.publishers} />
        </Typography>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {/* The exact API status string; never derived from configuration and
            never presented as observed remote delivery. */}
        <Typography variant="body2">{latestJob.status}</Typography>
        <div className="flex flex-wrap gap-1">
          {/* Target membership comes only from the job's own targets; option
              metadata supplies display labels and nothing else. */}
          {latestJob.targets.map((target) => (
            <Chip key={target.platform} size="small" label={getPlatformDisplayLabel(target.platform)} />
          ))}
        </div>
        <Typography variant="caption">
          <TranslatedContent content="jobUpdatedAt" namespace={NAMESPACES.enum.publishers} />
          {`: ${latestJob.updatedAt}`}
        </Typography>
      </div>
    );
  };

  const renderRow = (summary: ReportSummary) => {
    const { publisher, subscriptionPackage, enabledDistributionPlatforms } = summary.configuration;

    return (
      // Row identity is the publisher's own ID from the report configuration -
      // never row position, never the global active publisher.
      <TableRow key={publisher.publisherId}>
        <TableCell>
          <Typography variant="body2">{publisher.publisherName}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{subscriptionPackage}</Typography>
        </TableCell>
        <TableCell>
          {enabledDistributionPlatforms.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {enabledDistributionPlatforms.map((assignment) => (
                <Chip key={assignment.platform} size="small" label={getPlatformDisplayLabel(assignment.platform)} />
              ))}
            </div>
          ) : (
            <Typography variant="body2">
              <TranslatedContent content="noDistributionPlatforms" namespace={NAMESPACES.enum.publishers} />
            </Typography>
          )}
        </TableCell>
        <TableCell>{renderLatestJobCell(summary)}</TableCell>
        <TableCell>
          {/* Last-change facts come only from the report's `lastChange` audit
              metadata; nothing is synthesized from configuration or publisher
              timestamps. */}
          {summary.lastChange ? (
            <Typography variant="body2">{summary.lastChange.changedAt}</Typography>
          ) : (
            <Typography variant="body2">
              <TranslatedContent content="noLastChangeRecorded" namespace={NAMESPACES.enum.publishers} />
            </Typography>
          )}
        </TableCell>
        <TableCell>
          {/* One row, one bounded edit. The whole summary is handed over so the
              session snapshots this row's own publisher ID, package, platform
              set and version token together; the control is disabled whenever a
              session or a save is already outstanding, so a second publisher's
              edit cannot start and a pending attempt cannot be retargeted.
              There is no multi-row selection and no bulk action anywhere. */}
          <Button
            size="small"
            disabled={!canStartEdit}
            onClick={() => startEdit(summary)}
            aria-label={`${editActionLabel}: ${publisher.publisherName}`}
          >
            <TranslatedContent content="editAction" namespace={NAMESPACES.enum.publishers} />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PublisherAdministrationHeader
        selectedPublisherIds={selectedPublisherIds}
        changeSelectedPublisherIds={changeSelectedPublisherIds}
        selectedPackages={selectedPackages}
        changeSelectedPackages={changeSelectedPackages}
        selectedPlatforms={selectedPlatforms}
        changeSelectedPlatforms={changeSelectedPlatforms}
        selectedJobStatuses={selectedJobStatuses}
        changeSelectedJobStatuses={changeSelectedJobStatuses}
        jobPresence={jobPresence}
        changeJobPresence={changeJobPresence}
        publisherFilterOptions={publisherFilterOptions}
        packageFilterOptions={packageFilterOptions}
        platformFilterOptions={platformFilterOptions}
        jobStatusFilterOptions={jobStatusFilterOptions}
        getPlatformDisplayLabel={getPlatformDisplayLabel}
      />

      <ContentSection>
        {/* The outcome of the last save attempt, presented outside the table and
            named from the attempt's own captured publisher. A successful edit
            may legitimately move the publisher out of the active filters, so
            this must not depend on the row still being on the page - and no
            stale row is kept behind just to host it. */}
        {saveOutcome && (
          <Typography role="status">
            {saveOutcome.kind === 'saved' && (
              <TranslatedContent content="editorOutcomeSaved" namespace={NAMESPACES.enum.publishers} />
            )}
            {saveOutcome.kind === 'stale' && (
              <TranslatedContent content="editorOutcomeStale" namespace={NAMESPACES.enum.publishers} />
            )}
            {saveOutcome.kind === 'jobCreationDisabled' && (
              <TranslatedContent content="editorOutcomeJobCreationDisabled" namespace={NAMESPACES.enum.publishers} />
            )}
            {saveOutcome.kind === 'failed' && (
              <TranslatedContent content="editorOutcomeFailed" namespace={NAMESPACES.enum.publishers} />
            )}
            {` (${saveOutcome.publisherName})`}
            {saveOutcome.kind === 'failed' && saveOutcome.message ? `: ${saveOutcome.message}` : ''}
          </Typography>
        )}

        {viewState === 'reportLoading' && <Skeleton variant="rounded" height={192} />}

        {/* Truthful failure state: a failed report shows unavailable - it is
            never rendered as an empty result or as "no job" rows. */}
        {viewState === 'reportError' && (
          <Typography>
            <TranslatedContent content="reportUnavailable" namespace={NAMESPACES.enum.publishers} />
          </Typography>
        )}

        {/* A valid empty page: no publishers match the current filters. */}
        {viewState === 'emptyReport' && (
          <Typography>
            <TranslatedContent content="emptyReport" namespace={NAMESPACES.enum.publishers} />
          </Typography>
        )}

        {viewState === 'rows' && summaries && (
          <>
            {/* Durable job state is worker-reported; even SUCCEEDED is not
                evidence that any destination received or accepted anything. */}
            <Typography variant="body2">
              <TranslatedContent content="jobDeliveryDisclaimer" namespace={NAMESPACES.enum.publishers} />
            </Typography>
            <TableWrapper>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TranslatedContent content="publisherColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                  <TableCell>
                    <TranslatedContent content="packageColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                  <TableCell>
                    <TranslatedContent content="platformsColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                  <TableCell>
                    <TranslatedContent content="latestJobColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                  <TableCell>
                    <TranslatedContent content="lastChangeColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                  <TableCell>
                    <TranslatedContent content="actionsColumn" namespace={NAMESPACES.enum.publishers} />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{summaries.map(renderRow)}</TableBody>
            </TableWrapper>

            {/* Pagination is server-backed and count-derived. If the count read
                failed, that is reported instead of estimating page numbers. */}
            {countError ? (
              <Typography variant="caption">
                <TranslatedContent content="totalCountUnavailable" namespace={NAMESPACES.enum.publishers} />
              </Typography>
            ) : (
              totalPagesCount > 1 && (
                <div className="flex justify-center">
                  <Pagination count={totalPagesCount} page={activePage} onChange={(_, page) => changePage(page)} />
                </div>
              )
            )}
          </>
        )}
      </ContentSection>

      {/* Exactly one focused editor, mounted only for an open session and bound
          entirely to that session's own snapshot. */}
      {editSession && (
        <PublisherAdministrationEditor
          session={editSession}
          platformRows={editPlatformRows}
          isSaving={isSavingEdit}
          canCancel={canCancelEdit}
          changePackage={changeEditPackage}
          togglePlatform={toggleEditPlatform}
          save={saveEdit}
          cancelEdit={cancelEdit}
        />
      )}
    </div>
  );
};

export default PublisherAdministration;
