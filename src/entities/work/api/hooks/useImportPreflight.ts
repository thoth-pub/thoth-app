'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import type { ExistingWorkMatchesByIdentifier, ImportPlan, ImportPreflightReport } from '@/src/shared/types';
import { buildImportPreflightReport, collectImportIdentifiers } from '@/src/shared/utils';

const NO_EXISTING_MATCHES: ExistingWorkMatchesByIdentifier = new Map();

type UseImportPreflightResult = {
  /** The finished report, or `null` while it is being worked out or after it failed. */
  report: ImportPreflightReport | null;
  isChecking: boolean;
  hasFailed: boolean;
  retry: () => void;
};

/**
 * Runs the duplicate preflight for a final plan and hands back its report.
 *
 * Owns only the parts that need React and the network: which publisher to scope to, whether the
 * lookups are still running, whether they failed, and retrying them. The analysis itself is
 * `buildImportPreflightReport`, a pure function this hook feeds — so what the preview shows can
 * be tested without a component, and nothing about the report depends on when a lookup returned.
 *
 * Checks are scoped to the active publisher from the application's own publisher state, never to
 * every publisher the user can reach and never to a name typed in a file. A DOI matching a work
 * under a different imprint of the same publisher is still worth showing, so the scope stops at
 * the publisher and no narrower.
 *
 * Retrying is safe. The lookups are queries; running them again creates, updates and reserves
 * nothing. That is why this offers a retry at all, where a failed bulk creation deliberately does
 * not — a partly-executed import cannot be repeated safely, but a read can.
 */
const useImportPreflight = (plan: ImportPlan): UseImportPreflightResult => {
  const { activePublisher } = usePublisherStateMachine();
  const { importPreflightService } = useServices();

  const publisherId = activePublisher?.id ?? '';
  const isOnix = plan.onix !== undefined;
  const identifiers = useMemo(() => collectImportIdentifiers(plan), [plan]);

  // Nothing to check before a plan exists. A plan with no publisher to check it against is not a
  // clean report — it is an unanswered question, and is surfaced as a failure below rather than
  // as "no matching identifier was found".
  const isPlanReady = plan.works.length > 0;
  // ONIX target identity was already read and resolved before this immutable plan existed. Repeating that lookup here
  // would create a second, advisory snapshot that cannot safely rewrite the confirmed plan. CSV keeps the legacy read.
  const canCheck = isPlanReady && !isOnix && publisherId.length > 0;

  const {
    data: existingMatches,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    // Keyed by the identifiers themselves: two uploads asking the same questions of the same
    // publisher are the same query, and changing one identifier makes it a different one.
    queryKey: [QueryKeys.importPreflight, publisherId, identifiers],
    queryFn: () => importPreflightService.findExistingIdentifierMatches({ publisherId, identifiers }),
    enabled: canCheck,
    // A preflight is a snapshot of Thoth as it is now. Serving a remembered one would show the
    // user a picture of the catalogue from before the last import they ran.
    staleTime: 0,
    gcTime: 0,
    // Failure is offered to the user as an explicit retry instead, so the preview says what
    // happened rather than sitting on a spinner through three silent attempts.
    retry: false,
  });

  const report = useMemo(() => {
    if (!isPlanReady) return null;
    if (isOnix) return buildImportPreflightReport(plan, NO_EXISTING_MATCHES);
    return existingMatches ? buildImportPreflightReport(plan, existingMatches) : null;
  }, [isOnix, isPlanReady, plan, existingMatches]);

  return {
    report: !isOnix && isError ? null : report,
    isChecking: !isOnix && canCheck && !isError && report === null,
    hasFailed: !isOnix && isPlanReady && (isError || !canCheck),
    retry: () => {
      if (isOnix || !canCheck || isFetching) return;

      void refetch();
    },
  };
};

export default useImportPreflight;
