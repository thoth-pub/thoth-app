'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReplacePublisherServiceConfigurationInput } from '@/gql/graphql';
import { GraphqlError } from '@/src/shared/api/graphqlService';
import { useServices } from '@/src/shared/context';

import type { PublisherId } from '../../model/publisher.types';
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

// APP-01B: replaces the active publisher's service configuration.
//
// Success is only ever reported after the mutation resolves, and the exact
// server-normalized response - not a locally assumed state - replaces the
// publisher-scoped configuration cache. On failure nothing is written to the
// cache, so the last server-backed state stays authoritative. Stale and
// job-creation-disabled failures additionally refetch the protected configuration
// so the user sees current server truth before deciding to edit again. Retries are
// disabled: both conditions require a deliberate new attempt.
const useReplacePublisherServiceConfiguration = (publisherId: PublisherId) => {
  const { publisherService } = useServices();
  const queryClient = useQueryClient();

  const configurationQueryKey = [PUBLISHER_SERVICE_CONFIGURATION_QUERY_KEY, publisherId];

  const { mutateAsync, isPending } = useMutation({
    retry: false,
    mutationFn: (input: ReplacePublisherServiceConfigurationInput) =>
      publisherService.replacePublisherServiceConfiguration(input),
    onSuccess: (configuration) => {
      queryClient.setQueryData(configurationQueryKey, configuration);
    },
    onError: async (error: unknown) => {
      if (!getServiceConfigurationErrorType(error)) return;

      await queryClient.refetchQueries({ queryKey: configurationQueryKey });
    },
  });

  return {
    replaceServiceConfiguration: mutateAsync,
    loading: isPending,
  };
};

export default useReplacePublisherServiceConfiguration;
