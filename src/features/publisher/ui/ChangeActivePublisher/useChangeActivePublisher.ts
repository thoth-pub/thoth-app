'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef } from 'react';

import { type PublisherId } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { QueryKeys, ROUTES } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';
import { isRouteIncludesUUID } from '@/src/shared/utils/routes';

type UseChangeActivePublisherProps = {
  isHidden?: boolean;
};

const { activePublisherIdKey } = appConfig.persistentStorage;

const publisherScopedQueryKeys: ReadonlySet<string> = new Set([
  QueryKeys.books,
  QueryKeys.booksCount,
  QueryKeys.forthcomingBooksCount,
  QueryKeys.publishedBooksCount,
  QueryKeys.latestUpdatedBooks,
  QueryKeys.latestPublishedBooks,
  QueryKeys.work,
  QueryKeys.works,
  QueryKeys.worksCount,
  QueryKeys.workChapters,
  QueryKeys.workEditions,
  QueryKeys.workPrevEditions,
  QueryKeys.translatedWorks,
  QueryKeys.workTranslations,
  QueryKeys.workSet,
  QueryKeys.publisher,
  QueryKeys.linkedPublishers,
  QueryKeys.contribution,
  QueryKeys.series,
  QueryKeys.serieses,
  QueryKeys.seriesesCount,
  QueryKeys.allUserSerieses,
  QueryKeys.sets,
  QueryKeys.setsCount,
  QueryKeys.set,
  QueryKeys.bookSetWorks,
  QueryKeys.metadata,
  QueryKeys.publisherImprints,
]);

export const useChangeActivePublisher = (props: UseChangeActivePublisherProps) => {
  const { isHidden = false } = props;

  const { user, loading, isAuthoritative } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { persistentStorage } = useServices();
  const queryClient = useQueryClient();

  const { activePublisher, changeActivePublisher, resetLinkedPublishers, setLinkedPublishers } =
    usePublisherStateMachine();

  const authorizedPublishers = user.linkedPublishers
    .map((publisher) => ({
      ...publisher,
      name: publisher.publisherName,
      id: publisher.publisherId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const authorizedPublishersRef = useRef(authorizedPublishers);
  const activePublisherTransitionVersion = useRef(0);
  const hasInitialized = useRef(false);
  const prevSyncSnapshot = useRef<string | null>(null);
  const loadingRef = useRef(loading);

  authorizedPublishersRef.current = authorizedPublishers;
  loadingRef.current = loading;

  const publishersOptions = convertEntityToSelectFieldOptions(authorizedPublishers, 'name');

  const clearPublisherScopedQueries = () => {
    queryClient.removeQueries({
      predicate: (query) => {
        const rootQueryKey = query.queryKey[0];

        return typeof rootQueryKey === 'string' && publisherScopedQueryKeys.has(rootQueryKey);
      },
    });
  };

  const updateActivePublisher = async (publisherId: PublisherId, skipRedirect = false) => {
    const publisher = authorizedPublishersRef.current.find(
      (publisher) => publisher.id === publisherId,
    );

    if (!publisher) return;

    activePublisherTransitionVersion.current += 1;
    changeActivePublisher(publisher);
    clearPublisherScopedQueries();

    try {
      await persistentStorage.set(activePublisherIdKey, publisher.id);
    } finally {
      const isEditingWork = isRouteIncludesUUID(pathname);

      if (isEditingWork && !skipRedirect) router.push(ROUTES.DASHBOARD);
    }
  };

  const setActivePublisher = async () => {
    const initialAuthorizedPublishers = authorizedPublishersRef.current;

    if (initialAuthorizedPublishers.length === 0) return;

    const initializationVersion = activePublisherTransitionVersion.current + 1;

    activePublisherTransitionVersion.current = initializationVersion;

    setLinkedPublishers(initialAuthorizedPublishers, user.isSuperuser);

    const persistedPublisherId = await persistentStorage.get(activePublisherIdKey);

    if (initializationVersion !== activePublisherTransitionVersion.current) return;

    const latestAuthorizedPublishers = authorizedPublishersRef.current;
    const initialPublisher = latestAuthorizedPublishers.find(
      (publisher) => publisher.id === persistedPublisherId,
    ) ?? latestAuthorizedPublishers[0];

    if (!initialPublisher) {
      if (loadingRef.current) hasInitialized.current = false;
      return;
    }

    await updateActivePublisher(initialPublisher.id, true);
  };

  // Tracks whether the initial publisher setup has been performed and the
  // last-synced permissions without depending on XState context.
  const publisherSyncSnapshot = JSON.stringify(
    authorizedPublishers.map(({ id, name, publisherAdmin, workLifecycle, cdnWrite, imprints }) => ({
      id,
      name,
      publisherAdmin,
      workLifecycle,
      cdnWrite,
      imprints,
    })),
  );

  // Initialise the active publisher only when loading completes, reading the latest
  // user and store state without re-firing on them.
  const initializeActivePublisher = useEffectEvent(() => {
    if (loading || !isAuthoritative || hasInitialized.current) return;
    if (user.linkedPublishers.length === 0 && !activePublisher) return;

    hasInitialized.current = true;

    if (activePublisher) return;

    // Initial setup handles this snapshot, so sync must not select and persist it again.
    prevSyncSnapshot.current = publisherSyncSnapshot;
    void setActivePublisher();
  });

  useEffect(() => {
    initializeActivePublisher();
  }, [loading, isAuthoritative, publisherSyncSnapshot]);

  const syncPublishers = useEffectEvent(() => {
    if (!hasInitialized.current) return;
    if (loading || !isAuthoritative) return;

    if (publisherSyncSnapshot === prevSyncSnapshot.current) return;
    prevSyncSnapshot.current = publisherSyncSnapshot;

    if (authorizedPublishers.length === 0) {
      activePublisherTransitionVersion.current += 1;
      resetLinkedPublishers();
      clearPublisherScopedQueries();
      void persistentStorage.set(activePublisherIdKey, null);

      if (isRouteIncludesUUID(pathname)) router.push(ROUTES.DASHBOARD);
      return;
    }

    setLinkedPublishers(authorizedPublishers, user.isSuperuser);

    // Refresh active publisher so permission hooks see latest values.
    if (activePublisher) {
      const updated = authorizedPublishers.find((p) => p.id === activePublisher.id);

      if (updated) {
        activePublisherTransitionVersion.current += 1;
        changeActivePublisher(updated);
      } else {
        const nextActivePublisher = authorizedPublishers[0];

        void updateActivePublisher(nextActivePublisher.id);
      }
    } else {
      // Access may have returned after an empty permissions response reset the store.
      void updateActivePublisher(authorizedPublishers[0].id);
    }
  });

  useEffect(() => {
    syncPublishers();
  }, [authorizedPublishers]);

  const hideSelector = publishersOptions.length <= 1 || isHidden;

  return {
    activePublisher,
    publishersOptions,
    hideSelector,
    updateActivePublisher,
  };
};
