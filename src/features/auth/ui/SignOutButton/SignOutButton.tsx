'use client';

import LogoutIcon from '@mui/icons-material/Logout';

import { signOutAction } from '@/app/actions';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { IconButton } from '@/src/shared/ui';
import { useApolloClient } from '@apollo/client/react';
import { useEffect } from 'react';

const SignOutButton = () => {
  const { resetLinkedPublishers, activePublisher } = usePublisherStateMachine();
  const client = useApolloClient();

  const signOut = async () => {
    await signOutAction();
  };

  useEffect(() => {
    if (activePublisher) return;

    return () => {
      resetLinkedPublishers();
      client.clearStore();
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
