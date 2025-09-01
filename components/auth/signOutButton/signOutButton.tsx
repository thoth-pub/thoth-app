import LogoutIcon from '@mui/icons-material/Logout';

import { signOut } from '@/auth';
import { Button } from '@/components';
import { ROUTES } from '@/constants';

const SignOutButton = () => {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: ROUTES.LOGIN });
      }}
    >
      <Button variant="contained" type="submit" startIcon={<LogoutIcon className="ml-1 rotate-180" />}>
        Logout
      </Button>
    </form>
  );
};

export default SignOutButton;
