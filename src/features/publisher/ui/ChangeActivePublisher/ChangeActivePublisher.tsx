'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { type PublisherId } from '@/src/entities/publisher';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useUser } from '@/src/entities/user';
import { convertEntityToSelectFieldOptions, ROUTES } from '@/src/shared';
import { TextField } from '@/src/shared/ui';
import { isRouteIncludesUUID } from '@/src/shared/utils/routes';

type ChangeActivePublisherProps = {
  isHidden?: boolean;
};

const ChangeActivePublisher = ({ isHidden = false }: ChangeActivePublisherProps) => {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const { activePublisher, changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();

  const authorizedPublishers = user.linkedPublishers.map((publisher) => ({
    ...publisher,
    name: publisher.publisherName,
    id: publisher.publisherId,
  }));

  const publishersOptions = convertEntityToSelectFieldOptions(authorizedPublishers, 'name');

  useEffect(() => {
    if (loading || user.linkedPublishers.length === 0) return;

    setLinkedPublishers(authorizedPublishers, user.isSuperuser);
  }, [loading]);

  const handleUpdatePublisher = (publisherId: PublisherId) => {
    const publisher = authorizedPublishers.find((publisher) => publisher.id === publisherId);

    if (!publisher) return;

    changeActivePublisher(publisher);

    const isEditingWork = isRouteIncludesUUID(pathname);

    if (!isEditingWork) return;

    router.push(ROUTES.DASHBOARD);
  };

  return (
    <TextField
      options={publishersOptions}
      value={activePublisher?.id ?? ''}
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
      disabled={publishersOptions.length <= 1}
    />
  );
};

export default ChangeActivePublisher;
