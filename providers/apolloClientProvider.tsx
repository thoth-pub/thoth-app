import { ApolloNextAppProvider } from '@apollo/client-integration-nextjs';

import { createClient } from '@/app/queries';

function ApolloClientProvider({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={createClient}>{children}</ApolloNextAppProvider>;
}

export default ApolloClientProvider;
