'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReplacePublisherServiceConfigurationInput } from '@/gql/graphql';
import { GraphqlError } from '@/src/shared/api/graphqlService';
import { useServices } from '@/src/shared/context';

import { PUBLISHER_BACK_CATALOGUE_JOB_QUERY_KEY } from './usePublisherBackCatalogueJob';
import { PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY } from './usePublisherServiceConfiguration';
import {
  PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY,
  PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY,
} from './usePublisherServiceConfigurationReport';

// Stable backend classifications published by the Thoth v1.7 API under
// `extensions.type`. They are matched exactly; error messages are never parsed.
export const STALE_SERVICE_CONFIGURATION = 'STALE_SERVICE_CONFIGURATION';
export const DISTRIBUTION_JOB_CREATION_DISABLED = 'DISTRIBUTION_JOB_CREATION_DISABLED';

export type ServiceConfigurationErrorType =
  | typeof STALE_SERVICE_CONFIGURATION
  | typeof DISTRIBUTION_JOB_CREATION_DISABLED;

// Reads the backend classification carried on the first GraphQL error's opaque
// extensions. Anything else - including a non-GraphQL failure - is an unclassified
// error and must be handled as a plain failure.
export const getServiceConfigurationErrorType = (error: unknown): ServiceConfigurationErrorType | undefined => {
  if (!(error instanceof GraphqlError)) return undefined;

  const type = error.extensions?.type;

  if (type === STALE_SERVICE_CONFIGURATION || type === DISTRIBUTION_JOB_CREATION_DISABLED) return type;

  return undefined;
};

// APP-01B: replaces a publisher's service configuration.
//
// Success is only ever reported after the mutation resolves, and the exact
// server-normalized response - not a locally assumed state - replaces the
// publisher-scoped configuration cache. Cache writes and refetches are keyed by
// the publisherId of the exact mutation attempt's input, never by whichever
// publisher is active when the mutation settles, so a publisher switch while a
// mutation is in flight can never write or refetch another publisher's cache.
// On failure nothing is written to the cache, and the protected configuration is
// refetched regardless of classification: after a complete replace, a transport
// failure is ambiguous (the server may have committed without the response
// arriving), so displayed state must be re-anchored to server truth. Retries are
// disabled: every failure requires a deliberate new attempt.
//
// APP-01C: a replace can also change durable back-catalogue job state, so the
// same publisher's job report is reconciled from the API alongside the
// configuration - refetched after success (a committed replace may have created
// a job) and after every failure (an ambiguous failure may have committed;
// stale/job-disabled outcomes get a conservative refetch that claims nothing).
// No job is ever constructed locally, and both keys are scoped to the exact
// mutation attempt's `input.publisherId`.
//
// APP-02B: the same replace is also reachable from the staff publisher
// administration index, where the change can alter the row's package, its
// platform set, its configuration-change metadata, its latest job, whether the
// publisher still matches the active filters at all, and the filtered total.
// Those effects are not confined to the attempted publisher's own cache
// entries, so the APP-02A report and count families are reconciled as whole
// families after every outcome - see `reconcileStaffReport` below.
const useReplacePublisherServiceConfiguration = () => {
  const { publisherService } = useServices();
  const queryClient = useQueryClient();

  // Makes every cached APP-02A staff report and count entry stale, whatever
  // filter, page or ordering identity it was cached under, and refetches the
  // ones that are currently mounted so what staff are looking at comes back
  // from API truth. Deliberately family-wide and deliberately not a local
  // patch: a replace can move a publisher into or out of any cached filter
  // identity, so no cached row set or total may stay authoritative, and the
  // edited row must never be reconstructed from the submitted form values.
  const reconcileStaffReport = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: [PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY] }),
    ]);

  const { mutateAsync, isPending } = useMutation({
    retry: false,
    mutationFn: (input: ReplacePublisherServiceConfigurationInput) =>
      publisherService.replacePublisherServiceConfiguration(input),
    onSuccess: async (configuration, input) => {
      queryClient.setQueryData([PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, input.publisherId], configuration);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [PUBLISHER_BACK_CATALOGUE_JOB_QUERY_KEY, input.publisherId] }),
        reconcileStaffReport(),
      ]);
    },
    onError: async (_error: unknown, input) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, input.publisherId] }),
        queryClient.refetchQueries({ queryKey: [PUBLISHER_BACK_CATALOGUE_JOB_QUERY_KEY, input.publisherId] }),
        reconcileStaffReport(),
      ]);
    },
  });

  return {
    replaceServiceConfiguration: mutateAsync,
    loading: isPending,
  };
};

export default useReplacePublisherServiceConfiguration;
