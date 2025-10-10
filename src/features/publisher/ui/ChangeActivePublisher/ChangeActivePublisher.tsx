'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { PublisherId, usePublishers } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { convertEntityToSelectFieldOptions } from '@/src/shared';
import { TextField } from '@/src/shared/ui';

// TODO remove test data after review
const ChangeActivePublisher = () => {
  const { data: session } = useSession();

  const publisherIds = session?.user.linkedPublishers.map((publisher) => publisher.publisherId) ?? [];

  const { publishers } = usePublishers(publisherIds);

  const { activePublisher, changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();

  const publishersOptions = convertEntityToSelectFieldOptions(publishers, 'name');

  useEffect(() => {
    if (publishers.length === 0 || activePublisher) return;

    setLinkedPublishers(publishers);
  }, [publishers]);

  const handleUpdatePublisher = (publisher: PublisherId) => {
    changeActivePublisher(publisher);
  };

  return (
    <TextField
      options={publishersOptions}
      value={activePublisher}
      fullWidth
      select
      className="w-[240px] shrink-0"
      onChange={(e) => handleUpdatePublisher(e.target.value)}
      disabled={publishers.length === 1}
    />
  );
};

export default ChangeActivePublisher;
