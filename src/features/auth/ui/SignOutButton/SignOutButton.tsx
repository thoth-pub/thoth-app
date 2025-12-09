'use client';

import LogoutIcon from '@mui/icons-material/Logout';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { signOutAction } from '@/app/actions';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { IconButton } from '@/src/shared/ui';

const SignOutButton = () => {
  const { resetLinkedPublishers, activePublisher } = usePublisherStateMachine();
  const client = useQueryClient();

  const signOut = async () => {
    await signOutAction();
  };

  useEffect(() => {
    if (activePublisher) return;

    return () => {
      resetLinkedPublishers();
      client.clear();
    };
  }, []);

  return (
    <form action={signOut}>
      <IconButton type="submit" className="m-auto">
        <LogoutIcon className="rotate-180" />
      </IconButton>
    </form>
  );
};

export default SignOutButton;
