import { describe, expect, it } from 'vitest';

import { getQueryClient } from './queryClient';

describe('getQueryClient', () => {
  it('should return a QueryClient instance', () => {
    const client = getQueryClient();

    expect(client).toBeDefined();
    expect(client.getQueryCache()).toBeDefined();
  });

  it('should return the same instance when called twice in non-server environment', () => {
    const client1 = getQueryClient();
    const client2 = getQueryClient();

    expect(client1).toBe(client2);
  });
});
