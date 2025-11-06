'use client';

import { useEffect } from 'react';

import { type PublisherId, usePublishers } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { convertEntityToSelectFieldOptions } from '@/src/shared';
import { TextField } from '@/src/shared/ui';

type ChangeActivePublisherProps = {
  linkedPublishers: { publisherId: string; isAdmin: boolean }[];
  isSuperAdmin: boolean;
};

const ChangeActivePublisher = ({ linkedPublishers, isSuperAdmin = false }: ChangeActivePublisherProps) => {
  const ids = linkedPublishers.map((publisher) => publisher.publisherId);

  const { publishers } = usePublishers(ids, true);

  const { activePublisher, changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();

  const publishersOptions = convertEntityToSelectFieldOptions(publishers, 'name');

  useEffect(() => {
    if (publishers.length === 0 || activePublisher) return;

    const authorizedPublishers = publishers.map((publisher) => ({
      ...publisher,
      isAdmin: linkedPublishers.find((p) => p.publisherId === publisher.id)?.isAdmin ?? false,
    }));

    setLinkedPublishers(authorizedPublishers, isSuperAdmin);
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
