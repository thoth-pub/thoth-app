'use client';

import { useEffect } from 'react';

import { type PublisherId, usePublishers } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { convertEntityToSelectFieldOptions } from '@/src/shared';
import { TextField } from '@/src/shared/ui';

type ChangeActivePublisherProps = {
  isHidden?: boolean;
  linkedPublishers: { publisherId: string; isAdmin: boolean }[];
  isSuperAdmin: boolean;
};

const ChangeActivePublisher = ({
  linkedPublishers,
  isSuperAdmin = false,
  isHidden = false,
}: ChangeActivePublisherProps) => {
  const ids = linkedPublishers.map((publisher) => publisher.publisherId);

  const { publishers } = usePublishers(ids, isSuperAdmin);

  const { activePublisher, changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();

  const publishersOptions = convertEntityToSelectFieldOptions(publishers, 'name');

  useEffect(() => {
    if (publishers.length === 0 || activePublisher) return;

    const authorizedPublishers = publishers.map((publisher) => ({
      ...publisher,
      isAdmin: isSuperAdmin,
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
      className={`w-[240px] shrink-0 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
      slotProps={{
        select: {
          MenuProps: {
            sx: {
              '& .MuiMenuItem-root': {
                textTransform: 'none',
              },
            },
          },
        },
      }}
      sx={{
        '& .MuiSelect-select': {
          textTransform: 'none',
        },
      }}
      onChange={(e) => handleUpdatePublisher(e.target.value)}
      disabled={publishers.length === 1}
    />
  );
};

export default ChangeActivePublisher;
