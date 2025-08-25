import NextAuth, { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { ERRORS, ROUTES } from '@/constants';

import { AuthorizeUser } from './interfaces/auth';

const { INVALID_CREDENTIALS } = ERRORS;
const { LOGIN } = ROUTES;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const { email, password } = credentials;
        let user: DefaultSession['user'] | null = null;

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
          };

          return user;
        } catch (_error) {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: LOGIN,
  },
});
