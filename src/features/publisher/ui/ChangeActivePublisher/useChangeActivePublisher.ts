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

  const { user, loading } = useUser();
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
    const publisher = authorizedPublishers.find((publisher) => publisher.id === publisherId);

    if (!publisher) return;

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
    if (authorizedPublishers.length === 0) return;

    setLinkedPublishers(authorizedPublishers, user.isSuperuser);

    const persistedPublisherId = await persistentStorage.get(activePublisherIdKey);
    const initialPublisher = authorizedPublishers.find(
      (publisher) => publisher.id === persistedPublisherId,
    ) ?? authorizedPublishers[0];

    await updateActivePublisher(initialPublisher.id, true);
  };

  // Tracks whether the initial publisher setup has been performed and the
  // last-synced permissions without depending on XState context.
  const hasInitialized = useRef(false);
  const prevSyncSnapshot = useRef('');
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
    if (loading || hasInitialized.current) return;
    if (user.linkedPublishers.length === 0 && !activePublisher) return;

    hasInitialized.current = true;

    if (activePublisher) return;

    // Initial setup handles this snapshot, so sync must not select and persist it again.
    prevSyncSnapshot.current = publisherSyncSnapshot;
    void setActivePublisher();
  });

  useEffect(() => {
    initializeActivePublisher();
  }, [loading]);

  const syncPublishers = useEffectEvent(() => {
    if (!hasInitialized.current) return;
    if (loading) return;

    if (publisherSyncSnapshot === prevSyncSnapshot.current) return;
    prevSyncSnapshot.current = publisherSyncSnapshot;

    if (authorizedPublishers.length === 0) {
      resetLinkedPublishers();
      void persistentStorage.set(activePublisherIdKey, null);
      return;
    }

    setLinkedPublishers(authorizedPublishers, user.isSuperuser);

    // Refresh active publisher so permission hooks see latest values.
    if (activePublisher) {
      const updated = authorizedPublishers.find((p) => p.id === activePublisher.id);

      if (updated) {
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
