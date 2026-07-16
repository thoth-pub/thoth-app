'use client';

import LogoutIcon from '@mui/icons-material/Logout';
import { useQueryClient } from '@tanstack/react-query';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { IconButton } from '@/src/shared/ui';

const SignOutButton = () => {
  const { resetLinkedPublishers } = usePublisherStateMachine();
  const client = useQueryClient();

  const handleSubmit = () => {
    resetLinkedPublishers();
    client.clear();
  };

  return (
    <form action="/api/auth/logout" method="POST" onSubmit={handleSubmit}>
      <IconButton type="submit" className="m-auto">
        <LogoutIcon className="rotate-180" />
      </IconButton>
    </form>
  );
};

export default SignOutButton;
