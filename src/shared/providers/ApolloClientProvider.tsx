import { ApolloNextAppProvider } from '@apollo/client-integration-nextjs';

import { createClient } from '../api/client';

function ApolloClientProvider({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={createClient}>{children}</ApolloNextAppProvider>;
}

export default ApolloClientProvider;
