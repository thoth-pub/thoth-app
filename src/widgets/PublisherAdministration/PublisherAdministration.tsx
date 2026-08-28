'use client';

import type { GetPublisherServiceConfigurationReportQuery } from '@/gql/graphql';
import usePublisherOperatingContext from '@/src/features/publisher/ui/PublisherOperatingContext/usePublisherOperatingContext';
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
    totalCount,
    countError,
    totalPagesCount,
    activePage,
    changePage,
    canExport,
    isExporting,
    exportError,
    startExport,
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

  // APP-ADM-01: the deliberate publisher-workspace entry seam. It is entirely
  // separate from the edit session above - this widget only names a publisher to
  // enter; validating that publisher against authoritative `me.publisherContexts`,
  // applying publisher-scoped cache separation and navigating all belong to the
  // operating-context hook, and none of it causes a backend mutation.
  const { isStaffOperator, enterPublisherContext } = usePublisherOperatingContext();

  // Each row's Edit control gets an accessible name that identifies the exact
  // publisher it edits, so the affordance is never ambiguous between rows.
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.publishers });
  const editActionLabel = t('editAction');
  const openWorkspaceActionLabel = t('openWorkspaceAction');

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
      // never row position, never the global active publisher. The row carries
      // no whole-row action, so it deliberately does not opt into the shared
      // interactive-row treatment (#133): the only interaction remains the
      // explicit Edit button below.
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
          <div className="flex flex-wrap gap-2">
            {/* One row, one bounded edit. The whole summary is handed over so the
                session snapshots this row's own publisher ID, package, platform
                set and version token together; the control is disabled whenever a
                session or a save is already outstanding, so a second publisher's
                edit cannot start and a pending attempt cannot be retargeted.
                There is no multi-row selection and no bulk action anywhere.

                APP-ADM-01 leaves this action's meaning untouched: editing a
                publisher's service configuration neither reads nor changes any
                publisher operating context. */}
            <Button
              size="small"
              disabled={!canStartEdit}
              onClick={() => startEdit(summary)}
              aria-label={`${editActionLabel}: ${publisher.publisherName}`}
            >
              <TranslatedContent content="editAction" namespace={NAMESPACES.enum.publishers} />
            </Button>

            {/* APP-ADM-01: a separate, explicit entry into this publisher's
                workspace, carrying this row's own publisher ID and nothing else.
                It is not a bulk action, not a row-level handler and not a
                mutation - and it is withheld unless the viewer is an
                authoritative staff operator, with the hook failing closed again
                behind that. */}
            {isStaffOperator && (
              <Button
                size="small"
                onClick={() => void enterPublisherContext(publisher.publisherId)}
                aria-label={`${openWorkspaceActionLabel}: ${publisher.publisherName}`}
              >
                <TranslatedContent content="openWorkspaceAction" namespace={NAMESPACES.enum.publishers} />
              </Button>
            )}
          </div>
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

      {/* Report toolbar: the authoritative filtered total and the superuser-only
          full-population CSV export. Only an authoritative superuser reaches this
          return at all (identityPending/notAuthorized return early above), so the
          export control is structurally withheld from ordinary and not-yet-known
          identities; the export controller additionally refuses to start unless
          the authoritative superuser flag is set and no attempt is running. */}
      <ContentSection>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* The filtered total is the exact API count for the active filters. It
              is never derived from the number of rows on the visible page, and
              count-loading and count-unavailable are each distinct from a real
              zero. */}
          <div aria-live="polite">
            {countError ? (
              <Typography variant="body2">
                <TranslatedContent content="totalCountUnavailable" namespace={NAMESPACES.enum.publishers} />
              </Typography>
            ) : totalCount === undefined ? (
              <Typography variant="body2">
                <TranslatedContent content="countLoading" namespace={NAMESPACES.enum.publishers} />
              </Typography>
            ) : (
              <Typography variant="body2">
                {totalCount}{' '}
                <TranslatedContent content="matchingPublishers" namespace={NAMESPACES.enum.publishers} />
              </Typography>
            )}
          </div>

          {/* One export attempt at a time: the control is disabled while an
              attempt runs, and the controller captures an immutable filter/order
              snapshot at click time so later filter/page changes cannot retarget
              it. */}
          <Button size="small" onClick={startExport} disabled={!canExport}>
            <TranslatedContent
              content={isExporting ? 'exportInProgress' : 'exportCsv'}
              namespace={NAMESPACES.enum.publishers}
            />
          </Button>
        </div>

        {/* Fail-closed: a failed count/page read or a failed consistency check
            produces no file at all. The error is bounded and retryable, and the
            normal report/table state is left intact. */}
        {exportError && (
          <Typography role="alert" variant="body2">
            <TranslatedContent content="exportUnavailable" namespace={NAMESPACES.enum.publishers} />
          </Typography>
        )}
      </ContentSection>

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

            {/* Pagination is server-backed and count-derived. A failed count read
                is reported once by the filtered-total display in the toolbar
                above; here it simply means no page numbers are estimated. */}
            {!countError && totalPagesCount > 1 && (
              <div className="flex justify-center">
                <Pagination count={totalPagesCount} page={activePage} onChange={(_, page) => changePage(page)} />
              </div>
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
