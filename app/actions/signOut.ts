'use server';

import { signOut } from '@/auth';
import { ROUTES } from '@/src/shared/constants';

export const signOutAction = async () => {
  await signOut({
    redirectTo: ROUTES.DASHBOARD,
  });
};
