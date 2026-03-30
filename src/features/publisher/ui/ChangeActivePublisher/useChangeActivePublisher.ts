'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (loading || user.linkedPublishers.length === 0 || activePublisher) return;

    setActivePublisher();
  }, [loading]);

  const hideSelector = publishersOptions.length <= 1 || isHidden;

  return {
    activePublisher,
    publishersOptions,
    hideSelector,
    updateActivePublisher,
  };
};
