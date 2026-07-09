'use client';

import LogoutIcon from '@mui/icons-material/Logout';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { IconButton } from '@/src/shared/ui';

const SignOutButton = () => {
  const { resetLinkedPublishers, activePublisher } = usePublisherStateMachine();
  const client = useQueryClient();

  // On unmount, clear publisher-scoped state unless a publisher is active, reading the
  // state as it is at unmount time.
  const clearPublisherState = useEffectEvent(() => {
    if (activePublisher) return;

    resetLinkedPublishers();
    client.clear();
  });

  useEffect(() => {
    return () => {
      clearPublisherState();
    };
  }, []);

  return (
    <form action="/api/auth/logout" method="POST">
      <IconButton type="submit" className="m-auto">
        <LogoutIcon className="rotate-180" />
      </IconButton>
    </form>
  );
};

export default SignOutButton;
