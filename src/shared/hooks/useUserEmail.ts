'use client';

import { useSession } from 'next-auth/react';

const useUserEmail = () => {
  const { data: session } = useSession();

  return session?.user.email ?? '';
};

export default useUserEmail;
