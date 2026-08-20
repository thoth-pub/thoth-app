'use client';

import { useQuery } from '@tanstack/react-query';

import type { PublisherOrderBy } from '@/gql/graphql';
import { useServices } from '@/src/shared/context';

import type { PublisherServiceConfigurationReportFilters } from '../publisher.service';

// Query-key bases for the superuser-only publisher administration report
// (APP-02A). Kept local because the shared QueryKeys registry is outside this
// task's write budget.
export const PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY = 'publisherServiceConfigurationReport';
export const PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY = 'publisherServiceConfigurationReportCount';

type UsePublisherServiceConfigurationReportProps = {
  filters: PublisherServiceConfigurationReportFilters;
  limit: number;
  offset: number;
  order: PublisherOrderBy;
  // Presentation/query suppression only - true once authoritative user state
  // confirms the viewer is a superuser. The backend remains the authorization
  // boundary.
  isEligible: boolean;
};

// APP-02A: one paginated list query is the row authority and one count query is
// the total authority; both take the identical semantic filter model, and the
// service maps that model to variables through a single shared function so they
// cannot diverge.
//
// Both requests are suppressed via TanStack Query's `enabled` mechanism - never
// by conditional hook invocation - until `isEligible` is true, so neither a
// not-yet-authoritative identity nor an authoritative ordinary publisher
// executes any protected report/count request.
//
// Every semantic filter dimension, both page bounds and both order components
// are part of each query's identity (the count omits only pagination/order,
// which cannot affect a count), so incompatible filters, pages or orderings can
// never serve each other's cached rows, and no placeholder/previous-data
// carry-over is configured: while a changed identity loads or after it fails,
// there is no stale row set presented as current data. No polling or refetch
// interval is configured.
const usePublisherServiceConfigurationReport = ({
  filters,
  limit,
  offset,
  order,
  isEligible,
}: UsePublisherServiceConfigurationReportProps) => {
  const { publisherService } = useServices();

  const {
    data: summaries,
    isLoading,
    error,
  } = useQuery({
    queryKey: [PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY, filters, limit, offset, order],
    queryFn: () => publisherService.getPublisherServiceConfigurationReport({ filters, limit, offset, order }),
    enabled: isEligible,
  });

  const {
    data: totalCount,
    isLoading: isCountLoading,
    error: countError,
  } = useQuery({
    queryKey: [PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY, filters],
    queryFn: () => publisherService.getPublisherServiceConfigurationReportCount(filters),
    enabled: isEligible,
  });

  return {
    // undefined until loaded (disabled, loading, or failed - see `error`); a
    // loaded empty array is a valid empty filtered result, not an error.
    summaries,
    isLoading,
    error,
    totalCount,
    isCountLoading,
    countError,
  };
};

export default usePublisherServiceConfigurationReport;
