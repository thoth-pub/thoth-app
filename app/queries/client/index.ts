import { HttpLink } from '@apollo/client';
import { ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';

import { fragmentRegistry } from '../registries';

export const createClient = () => {
  return new ApolloClient({
    cache: new InMemoryCache({
      fragments: fragmentRegistry,
    }),
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_THOTH_API_URL,
    }),
  });
};
