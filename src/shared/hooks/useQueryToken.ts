'use client';

import { useSession } from 'next-auth/react';

const useQueryToken = () => {
  const { data: session } = useSession();

  return session?.accessToken ?? '';
};

export default useQueryToken;
