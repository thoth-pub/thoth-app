import type { QueryClient } from './queryClient';

export abstract class BaseService {
  protected readonly queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }
}
