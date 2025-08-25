'use server';

import { signIn } from '@/auth';
import { ROUTES } from '@/constants';

export const signInAction = async (credentials: { email: string; password: string }) => {
  const { email, password } = credentials;

  await signIn('credentials', {
    email,
    password,
    redirectTo: ROUTES.DASHBOARD,
  });
};
