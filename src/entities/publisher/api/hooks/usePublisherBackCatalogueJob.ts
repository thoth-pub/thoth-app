'use client';

import { useQuery } from '@tanstack/react-query';

import { useServices } from '@/src/shared/context';

import type { PublisherId } from '../../model/publisher.types';

// Query-key base for the superuser-only latest back-catalogue job report. Scoped
// per publisher below so switching the active publisher can never surface a job
// belonging to another publisher, and exported so the APP-01B replace mutation
// can reconcile exactly its own attempt's publisher-scoped report. Kept local
// because the shared QueryKeys registry is outside this task's write budget.
export const PUBLISHER_BACK_CATALOGUE_JOB_QUERY_KEY = 'publisherBackCatalogueJob';

// APP-01C: reads the active publisher's latest back-catalogue job report.
//
// The request is suppressed via TanStack Query's `enabled` mechanism - never by
// conditional hook invocation - unless there is both a publisher ID and
// superuser presentation eligibility, so ordinary publishers execute no staff
// report request at all. Eligibility here is presentation/query suppression
// only; the backend remains the authorization boundary. No polling or refetch
// interval is configured.
//
// The returned `report` distinguishes, together with `isLoading`/`error`:
// - undefined: not loaded (disabled, loading, or failed - see `error`);
// - null: the report returned no summary for the requested publisher;
// - a summary whose `latestBackCatalogueJob` is null: no job is recorded;
// - a summary with a job: the API-provided latest job facts.
const usePublisherBackCatalogueJob = (publisherId: PublisherId, isSuperuser: boolean) => {
  const { publisherService } = useServices();

  const { data, isLoading, error } = useQuery({
    queryKey: [PUBLISHER_BACK_CATALOGUE_JOB_QUERY_KEY, publisherId],
    queryFn: () => publisherService.getPublisherBackCatalogueJobReport(publisherId),
    enabled: publisherId.length > 0 && isSuperuser,
  });

  return {
    report: data,
    isLoading,
    error,
  };
};

export default usePublisherBackCatalogueJob;
