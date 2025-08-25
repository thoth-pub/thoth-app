import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { ERRORS, ROUTES } from '@/constants';

import type { AuthorizeUser, LinkedPublisher } from './interfaces/auth';

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
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.linkedPublishers = token.linkedPublishers as LinkedPublisher[];
      }
      return session;
    },
  },
  pages: {
    signIn: LOGIN,
  },
});
