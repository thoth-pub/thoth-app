import { registerApolloClient } from '@apollo/client-integration-nextjs';

import { createClient } from '@/app/queries';

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  const client = createClient();

  return client;
});
