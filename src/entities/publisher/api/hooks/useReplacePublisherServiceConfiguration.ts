'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReplacePublisherServiceConfigurationInput } from '@/gql/graphql';
import { GraphqlError } from '@/src/shared/api/graphqlService';
import { useServices } from '@/src/shared/context';

import { PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY } from './usePublisherServiceConfiguration';

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
const useReplacePublisherServiceConfiguration = () => {
  const { publisherService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    retry: false,
    mutationFn: (input: ReplacePublisherServiceConfigurationInput) =>
      publisherService.replacePublisherServiceConfiguration(input),
    onSuccess: (configuration, input) => {
      queryClient.setQueryData([PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, input.publisherId], configuration);
    },
    onError: async (_error: unknown, input) => {
      await queryClient.refetchQueries({ queryKey: [PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, input.publisherId] });
    },
  });

  return {
    replaceServiceConfiguration: mutateAsync,
    loading: isPending,
  };
};

export default useReplacePublisherServiceConfiguration;
