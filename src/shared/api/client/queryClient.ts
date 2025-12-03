import { isServer, QueryClient } from '@tanstack/react-query';

import { appConfig } from '../../config';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: appConfig.query,
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
