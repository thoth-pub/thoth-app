'use client';

import { useEffect } from 'react';

import { type PublisherId, usePublishers } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { convertEntityToSelectFieldOptions } from '@/src/shared';
import { TextField } from '@/src/shared/ui';

type ChangeActivePublisherProps = {
  linkedPublishers: PublisherId[];
};

const ChangeActivePublisher = ({ linkedPublishers }: ChangeActivePublisherProps) => {
  const { publishers } = usePublishers(linkedPublishers);

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
