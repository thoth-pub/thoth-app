'use client';

import { useSession } from 'next-auth/react';

const useQueryToken = () => {
  const { data: session } = useSession();

  // APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285): once the access token could not
  // be refreshed, the token the session still carries is known to be dead. It is
  // not handed out, so nothing is queried with it and identity reads as not
  // loaded rather than as a user with no publishers.
  if (session?.error === 'RefreshAccessTokenError') return '';

  return session?.accessToken ?? '';
};

export default useQueryToken;
