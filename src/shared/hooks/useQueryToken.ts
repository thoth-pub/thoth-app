'use client';

import { useSession } from 'next-auth/react';

const useQueryToken = () => {
  const { data: session } = useSession();

  return session?.user.queryToken ?? '';
};

export default useQueryToken;
