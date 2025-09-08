import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import type { AuthorizeUser, LinkedPublisher } from '@/src/entities/auth';
import { ERRORS, ROUTES } from '@/src/shared/constants';

const { INVALID_CREDENTIALS } = ERRORS;
const { LOGIN } = ROUTES;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const { email, password } = credentials;
        let user: User | null = null;

        try {
          const response: AuthorizeUser = await fetch(`${process.env.THOTH_AUTH_API_URL}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          }).then((res) => res.json());

          if (!response) {
            throw new Error(INVALID_CREDENTIALS);
          }

          user = {
            id: response.accountId,
            name: response.name,
            email: response.email,
            image: null,
            linkedPublishers: response.resourceAccess.linkedPublishers,
            isSuperAdmin: response.resourceAccess.isSuperuser ?? false,
            queryToken: response.token,
          };

          return user;
        } catch (_error) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.linkedPublishers = user.linkedPublishers;
        token.isSuperAdmin = user.isSuperAdmin;
        token.queryToken = user.queryToken;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.linkedPublishers = token.linkedPublishers as LinkedPublisher[];
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.queryToken = token.queryToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: LOGIN,
  },
});
