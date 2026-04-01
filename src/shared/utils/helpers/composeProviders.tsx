import type React from 'react';

export const composeProviders =
  (...providers: Array<React.ComponentType<{ children: React.ReactNode }>>) =>
  ({ children }: { children: React.ReactNode }) =>
    providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
