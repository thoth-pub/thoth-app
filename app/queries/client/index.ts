import { HttpLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';

import { fragmentRegistry } from '../registries';

export const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_THOTH_API_URL,
});

export const setAuthorizationHeader = (token: string) =>
  new SetContextLink((prevContext) => {
    return {
      headers: {
        ...prevContext.headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

export const createClient = () => {
  return new ApolloClient({
    cache: new InMemoryCache({
      fragments: fragmentRegistry,
    }),
    link: httpLink,
  });
};
