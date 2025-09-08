import type { Session } from 'next-auth';

export const isAdmin = (session: Session) => {
  return session?.user?.isSuperAdmin ?? false;
};
