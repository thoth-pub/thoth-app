import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequest = vi.fn();
vi.mock('graphql-request', () => ({
  default: mockRequest,
  request: mockRequest,
  ClientError: class ClientError extends Error {
    response: { errors?: Array<{ message: string }> };
    constructor(message: string) {
      super(message);
      this.response = { errors: [{ message }] };
    }
  },
}));

const { GraphqlService } = await import('./index');

describe('GraphqlService', () => {
  let service: GraphqlService;

  beforeEach(() => {
    mockRequest.mockReset();
    service = new GraphqlService('test-token');
  });

  describe('query', () => {
    it('should call request with correct arguments and return data', async () => {
      const mockQuery = 'query { test }' as any;
      const variables = { id: '123' };
      const expectedData = { test: 'data' };

      mockRequest.mockResolvedValue(expectedData);

      const result = await service.query(mockQuery, variables);

      expect(mockRequest).toHaveBeenCalledWith(
        '',
        mockQuery,
        variables,
        { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      );
      expect(result).toBe(expectedData);
    });

    it('should throw ClientError message when request fails', async () => {
      const { ClientError } = await import('graphql-request');

      mockRequest.mockRejectedValue(new ClientError('Not found'));

      const promise = service.query('query { test }' as any, {});

      await expect(promise).rejects.toThrow('Not found');
    });

    it('should rethrow non-ClientError errors', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      const promise = service.query('query { test }' as any, {});

      await expect(promise).rejects.toThrow('Network error');
    });
  });

  describe('mutation', () => {
    it('should call request and return data', async () => {
      const mockMutation = 'mutation { create }' as any;
      const variables = { data: { name: 'test' } };
      const expectedData = { create: { id: '1' } };

      mockRequest.mockResolvedValue(expectedData);

      const result = await service.mutation(mockMutation, variables);

      expect(mockRequest).toHaveBeenCalledWith(
        '',
        mockMutation,
        variables,
        { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      );
      expect(result).toBe(expectedData);
    });
  });
});
