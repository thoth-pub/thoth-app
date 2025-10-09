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

  const test = [
    ...publishers,
    {
      id: '5e62434f-d92b-45e5-a658-9a916fa64f4b',
      name: 'Test',
      shortName: 'Test',
      url: 'Test',
      updatedAt: '',
    },
  ];

  const publishersOptions = convertEntityToSelectFieldOptions(test, 'name');

  useEffect(() => {
    if (publishers.length === 0 || activePublisher) return;

    setLinkedPublishers(test);
  }, [test]);

  const handleUpdatePublisher = (publisher: PublisherId) => {
    changeActivePublisher(publisher);
  };

  return (
    <TextField
      options={publishersOptions}
      value={activePublisher}
      fullWidth
      select
      onChange={(e) => handleUpdatePublisher(e.target.value)}
      disabled={test.length === 1}
    />
  );
};

export default ChangeActivePublisher;
