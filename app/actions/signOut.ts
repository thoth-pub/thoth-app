'use server';

import { signOut } from '@/auth';
import { ROUTES } from '@/constants';

export const signOutAction = async () => {
  await signOut({
    redirectTo: ROUTES.DASHBOARD,
  });
};
