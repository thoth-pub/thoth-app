'use client';

import { useState } from 'react';

import {
  Direction,
  DistributionJobStatus,
  DistributionPlatform,
  PublisherField,
  type PublisherOrderBy,
  ThothPackage,
} from '@/gql/graphql';
import useDistributionPlatformOptions from '@/src/entities/publisher/api/hooks/useDistributionPlatformOptions';
import usePublisherServiceConfigurationReport from '@/src/entities/publisher/api/hooks/usePublisherServiceConfigurationReport';
import type { PublisherServiceConfigurationReportFilters } from '@/src/entities/publisher/api/publisher.service';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { getPagesCount } from '@/src/shared/utils';

// Bounded tri-state job-presence filter. It maps explicitly to the report's
// nullable `withoutBackCatalogueJob` argument: `all` omits the dimension
// (null), `withoutJob` requests publishers with no recorded back-catalogue job
// (true), `withJob` requests publishers with at least one (false).
export type JobPresenceFilter = 'all' | 'withoutJob' | 'withJob';

export type PublisherAdministrationViewState =
  | 'identityPending'
  | 'notAuthorized'
  | 'reportLoading'
  | 'reportError'
  | 'emptyReport'
  | 'rows';

// The staff index is always presented in one explicit, stable order. The
// backend contract additionally sorts by publisher ID ascending, so pagination
// stays deterministic.
const REPORT_ORDER: PublisherOrderBy = {
  field: PublisherField.PublisherName,
  direction: Direction.Asc,
};

// APP-02A: state for the superuser publisher administration index.
//
// The consolidated report is the only row/list authority. This hook is
// deliberately independent of the global active-publisher machinery: it never
// reads `activePublisher` for filters, enablement, identity or pagination, so
// switching the active publisher elsewhere cannot retarget, refilter or
// invalidate the staff index.
const usePublisherAdministration = () => {
  const { user, isAuthoritative } = useUser();

  // Protected report/count requests may only start once user state is
  // authoritative AND confirms a superuser; until then - and for every
  // authoritative ordinary publisher - the report hook keeps both queries
  // disabled, so no staff request is executed at all. Presentation gating only:
  // the backend remains the authorization boundary.
  const isReportEligible = isAuthoritative && user.isSuperuser;

  const [selectedPublisherIds, setSelectedPublisherIds] = useState<PublisherId[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<ThothPackage[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<DistributionPlatform[]>([]);
  const [selectedJobStatuses, setSelectedJobStatuses] = useState<DistributionJobStatus[]>([]);
  const [jobPresence, setJobPresence] = useState<JobPresenceFilter>('all');
  const [activePage, setActivePage] = useState(1);

  const limit = appConfig.data.itemsPerRequestLimit;
  const offset = (activePage - 1) * limit;

  // One semantic filter model feeds both the list and the count. Backend
  // semantics are passed through exactly: `enabledPlatforms` narrows (every
  // selected platform must be enabled), `jobStatuses` widens (the latest job
  // may match any selected status), and job presence is the explicit tri-state
  // mapping documented on JobPresenceFilter.
  const filters: PublisherServiceConfigurationReportFilters = {
    publishers: selectedPublisherIds,
    packages: selectedPackages,
    enabledPlatforms: selectedPlatforms,
    jobStatuses: selectedJobStatuses,
    withoutBackCatalogueJob: jobPresence === 'all' ? null : jobPresence === 'withoutJob',
  };

  const { summaries, isLoading, error, totalCount, countError } = usePublisherServiceConfigurationReport({
    filters,
    limit,
    offset,
    order: REPORT_ORDER,
    isEligible: isReportEligible,
  });

  // Code-owned platform metadata, used for display labels and filter-control
  // options only; it never adds or removes platform membership on a row.
  const { distributionPlatformOptions } = useDistributionPlatformOptions();

  // Every filter change returns to the first page, so a page number from one
  // filter identity is never applied to another.
  const changeSelectedPublisherIds = (publisherIds: PublisherId[]) => {
    setSelectedPublisherIds(publisherIds);
    setActivePage(1);
  };

  const changeSelectedPackages = (packages: ThothPackage[]) => {
    setSelectedPackages(packages);
    setActivePage(1);
  };

  const changeSelectedPlatforms = (platforms: DistributionPlatform[]) => {
    setSelectedPlatforms(platforms);
    setActivePage(1);
  };

  const changeSelectedJobStatuses = (jobStatuses: DistributionJobStatus[]) => {
    setSelectedJobStatuses(jobStatuses);
    setActivePage(1);
  };

  const changeJobPresence = (presence: JobPresenceFilter) => {
    setJobPresence(presence);
    setActivePage(1);
  };

  const changePage = (page: number) => {
    setActivePage(page);
  };

  // Superusers' linked publishers are authoritative user data enumerating the
  // publisher population; they are only the source of filter-control options,
  // never the report list authority.
  const publisherFilterOptions = user.linkedPublishers.map((publisher) => ({
    id: publisher.publisherId,
    name: publisher.publisherName,
  }));

  const packageFilterOptions = Object.values(ThothPackage);
  const jobStatusFilterOptions = Object.values(DistributionJobStatus);

  // Filter options for platforms come from the backend option list when it is
  // available; the pinned contract's enum values are the fallback so filtering
  // stays possible if the metadata read fails. Labels are backend-provided with
  // the platform code as fallback - no name-based inference.
  const platformFilterOptions =
    distributionPlatformOptions && distributionPlatformOptions.length > 0
      ? distributionPlatformOptions.map((option) => option.platform)
      : Object.values(DistributionPlatform);

  const getPlatformDisplayLabel = (platform: DistributionPlatform) =>
    distributionPlatformOptions?.find((option) => option.platform === platform)?.displayLabel ?? platform;

  const totalPagesCount = getPagesCount(totalCount ?? 0);

  // A valid empty page is distinguished from an error: `summaries` only holds a
  // value once the report actually loaded, and a failed replacement query never
  // leaves a previous page presented as current (no previous-data carry-over is
  // configured on the report hook).
  const viewState: PublisherAdministrationViewState = !isAuthoritative
    ? 'identityPending'
    : !user.isSuperuser
      ? 'notAuthorized'
      : error
        ? 'reportError'
        : summaries === undefined || isLoading
          ? 'reportLoading'
          : summaries.length === 0
            ? 'emptyReport'
            : 'rows';

  return {
    // Gating
    viewState,

    // Rows (undefined unless loaded; rows come exclusively from the report)
    summaries,
    error,

    // Count / pagination
    totalCount,
    countError,
    totalPagesCount,
    activePage,
    changePage,

    // Filters
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

    // Filter-control options
    publisherFilterOptions,
    packageFilterOptions,
    platformFilterOptions,
    jobStatusFilterOptions,

    // Display metadata (labels only, never membership)
    getPlatformDisplayLabel,
  };
};

export default usePublisherAdministration;
