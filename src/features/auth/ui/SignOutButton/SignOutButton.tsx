import LogoutIcon from '@mui/icons-material/Logout';

import { signOutAction } from '@/app/actions';
import { Button } from '@/src/shared/ui';

const SignOutButton = () => {
  return (
    <form action={signOutAction}>
      <Button variant="contained" type="submit" startIcon={<LogoutIcon className="ml-1 rotate-180" />}>
        Logout
      </Button>
    </form>
  );
};

export default SignOutButton;
