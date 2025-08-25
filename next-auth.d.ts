// next-auth.d.ts
import NextAuth from 'next-auth';

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  linkedPublishers: LinkedPublisher[];
}

declare module 'next-auth' {
  interface Session {
    user: AuthUser;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends AuthUser {}
}
