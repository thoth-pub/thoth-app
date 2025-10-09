'use client';

import LogoutIcon from '@mui/icons-material/Logout';

import { signOutAction } from '@/app/actions';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { Button } from '@/src/shared/ui';

const SignOutButton = () => {
  const { resetLinkedPublishers } = usePublisherStateMachine();

  const signOut = async () => {
    await signOutAction();
    resetLinkedPublishers();
  };

  return (
    <form action={signOut}>
      <Button variant="contained" type="submit" startIcon={<LogoutIcon className="ml-1 rotate-180" />}>
        Logout
      </Button>
    </form>
  );
};

export default SignOutButton;
