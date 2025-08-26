import { query } from '@/utils';

export abstract class BaseService {
  protected readonly queryClient: typeof query;

  constructor(queryClient: typeof query) {
    this.queryClient = queryClient;
  }
}
