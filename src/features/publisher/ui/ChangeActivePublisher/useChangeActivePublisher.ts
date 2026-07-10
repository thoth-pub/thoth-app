'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef } from 'react';

import { type PublisherId } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { ROUTES } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';
import { isRouteIncludesUUID } from '@/src/shared/utils/routes';

type UseChangeActivePublisherProps = {
  isHidden?: boolean;
};

const { activePublisherIdKey } = appConfig.persistentStorage;

export const useChangeActivePublisher = (props: UseChangeActivePublisherProps) => {
  const { isHidden = false } = props;

  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { persistentStorage } = useServices();
  const queryClient = useQueryClient();

  const { activePublisher, changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();

  const authorizedPublishers = user.linkedPublishers
    .map((publisher) => ({
      ...publisher,
      name: publisher.publisherName,
      id: publisher.publisherId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const publishersOptions = convertEntityToSelectFieldOptions(authorizedPublishers, 'name');

  const updateActivePublisher = async (publisherId: PublisherId, skipRedirect = false) => {
    const publisher = authorizedPublishers.find((publisher) => publisher.id === publisherId);

    if (!publisher) return;

    changeActivePublisher(publisher);
    queryClient.clear();

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

    if (!persistedPublisherId) {
      updateActivePublisher(authorizedPublishers[0].id, true);
    }

    updateActivePublisher(persistedPublisherId as PublisherId, true);
  };

  // Tracks whether the initial publisher setup has been performed.
  const hasInitialized = useRef(false);

  // Initialise the active publisher only when loading completes, reading the latest
  // user and store state without re-firing on them.
  const initializeActivePublisher = useEffectEvent(() => {
    if (loading || user.linkedPublishers.length === 0 || activePublisher) return;

    hasInitialized.current = true;
    setActivePublisher();
  });

  useEffect(() => {
    initializeActivePublisher();
  }, [loading]);

  // Serialised snapshot of the last-synced publisher list, used to detect
  // changes without depending on XState context (which would re-trigger).
  const prevSyncSnapshot = useRef('');

  const syncPublishers = useEffectEvent(() => {
    if (!hasInitialized.current) return;
    if (authorizedPublishers.length === 0) return;

    const snapshot = JSON.stringify(
      authorizedPublishers.map(({ id, publisherAdmin, workLifecycle, cdnWrite, imprints }) => ({
        id,
        publisherAdmin,
        workLifecycle,
        cdnWrite,
        imprints,
      })),
    );

    if (snapshot === prevSyncSnapshot.current) return;
    prevSyncSnapshot.current = snapshot;

    setLinkedPublishers(authorizedPublishers, user.isSuperuser);

    // Refresh active publisher so permission hooks see latest values.
    if (activePublisher) {
      const updated = authorizedPublishers.find((p) => p.id === activePublisher.id);
      if (updated) changeActivePublisher(updated);
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
