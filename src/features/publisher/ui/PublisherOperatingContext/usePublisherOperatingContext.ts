'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { PublisherId } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { ROUTES } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { clearPublisherScopedQueries } from '../ChangeActivePublisher/useChangeActivePublisher';

const { staffPublisherContextIdKey } = appConfig.persistentStorage;

export type StaffContextOutcome = 'entered' | 'restored' | 'rejected';

// APP-ADM-01 (ADR-0010): the superuser publisher OPERATING CONTEXT lifecycle.
//
// This is deliberately NOT the ordinary publisher user's active-publisher
// persistence. It shares the XState machinery and the publisher-scoped query
// separation, but nothing else: it has its own storage identity, it is only
// ever entered by an explicit user action, and when no valid context exists it
// fails closed to Admin instead of picking a publisher.
//
// Identity truth is the backend's, read through the existing `me` query. The
// hook refuses to act at all until that identity is authoritative, so a pending
// or failed user query can never be mistaken for an ordinary `isSuperuser:false`
// user - and the backend remains the actual authorization boundary for
// everything a publisher context can reach.
const usePublisherOperatingContext = () => {
  const { user, isAuthoritative } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { persistentStorage } = useServices();
  const { activePublisher, changeActivePublisher, setLinkedPublishers, resetLinkedPublishers } =
    usePublisherStateMachine();

  // Only an authoritative superuser operates a staff context.
  const isStaffOperator = isAuthoritative && user.isSuperuser;

  // The authoritative publisher set is exactly what `me.publisherContexts`
  // reports for the current user (superusers already receive all publishers),
  // mapped into the shape the publisher store speaks. Nothing is inferred.
  const staffPublishers = user.linkedPublishers
    .map((publisher) => ({
      ...publisher,
      id: publisher.publisherId,
      name: publisher.publisherName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const clearStaffContext = async () => {
    await persistentStorage.set(staffPublisherContextIdKey, null);
    resetLinkedPublishers();
    clearPublisherScopedQueries(queryClient);
  };

  // Acceptance 19, live half. `restoreStaffContext` only validates a STORED
  // context, and it returns early once one is already active - so a workspace
  // that is already mounted must be revoked here instead. When a later
  // authoritative `me` result stops listing the publisher whose context is
  // active, that context dies immediately: it is never quietly swapped for
  // another publisher the operator still happens to be allowed to open.
  //
  // Invalidation only. A still-listed active publisher is left exactly alone,
  // and an ordinary publisher user never reaches this at all.
  const revokedPublisherId = useRef<PublisherId | null>(null);

  const activeStaffPublisherId = isStaffOperator ? (activePublisher?.id ?? null) : null;
  const isActiveStaffPublisherAuthorized =
    activeStaffPublisherId === null ||
    staffPublishers.some((candidate) => candidate.id === activeStaffPublisherId);

  // Reads the current clear path and router without re-firing on their identity.
  const revokeStaffContext = useEffectEvent(async () => {
    await clearStaffContext();
    router.replace(ROUTES.ADMIN);
  });

  useEffect(() => {
    if (activeStaffPublisherId === null || isActiveStaffPublisherAuthorized) return;
    // One revocation per context: the machine reset lands a render later.
    if (revokedPublisherId.current === activeStaffPublisherId) return;

    revokedPublisherId.current = activeStaffPublisherId;
    void revokeStaffContext();
  }, [activeStaffPublisherId, isActiveStaffPublisherAuthorized]);

  const applyStaffPublisher = (publisher: (typeof staffPublishers)[number]) => {
    // `changeActivePublisher` is only accepted once the machine has left `init`.
    setLinkedPublishers(staffPublishers, true);
    changeActivePublisher(publisher);
    clearPublisherScopedQueries(queryClient);
  };

  // Deliberate entry from Admin. Causes no backend mutation whatsoever: it sets
  // client context, resets publisher-scoped cache and navigates.
  const enterPublisherContext = async (publisherId: PublisherId): Promise<StaffContextOutcome> => {
    if (!isStaffOperator) return 'rejected';

    const publisher = staffPublishers.find((candidate) => candidate.id === publisherId);

    // Fail closed: an unknown publisher never becomes "some other publisher".
    if (!publisher) return 'rejected';

    applyStaffPublisher(publisher);
    await persistentStorage.set(staffPublisherContextIdKey, publisher.id);
    router.push(ROUTES.DASHBOARD);

    return 'entered';
  };

  // Survives normal workspace navigation and browser refresh within the same
  // authenticated session, and only from the staff-specific key.
  const restoreStaffContext = async (): Promise<StaffContextOutcome> => {
    if (!isStaffOperator) return 'rejected';
    if (activePublisher) return 'restored';

    const storedPublisherId = await persistentStorage.get(staffPublisherContextIdKey);
    const publisher =
      typeof storedPublisherId === 'string'
        ? staffPublishers.find((candidate) => candidate.id === storedPublisherId)
        : undefined;

    // Absent or no longer in authoritative `me.publisherContexts`: clear it and
    // return to Admin. Never silently fall back to another publisher.
    if (!publisher) {
      await clearStaffContext();
      router.replace(ROUTES.ADMIN);

      return 'rejected';
    }

    applyStaffPublisher(publisher);

    return 'restored';
  };

  const returnToAdmin = async () => {
    await clearStaffContext();
    router.push(ROUTES.ADMIN);
  };

  return {
    isStaffOperator,
    staffPublisher: activePublisher,
    enterPublisherContext,
    restoreStaffContext,
    returnToAdmin,
    clearStaffContext,
  };
};

export default usePublisherOperatingContext;
