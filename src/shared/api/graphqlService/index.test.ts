import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequest = vi.fn();
vi.mock('graphql-request', () => ({
  default: mockRequest,
  request: mockRequest,
  ClientError: class ClientError extends Error {
    response: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
    constructor(message: string, extensions?: Record<string, unknown>) {
      super(message);
      this.response = { errors: [{ message, ...(extensions ? { extensions } : {}) }] };
    }
  },
}));

const { GraphqlError, GraphqlService } = await import('./index');

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

  // The transport carries the first GraphQL error's server-returned extensions so
  // feature code can read a stable backend classification instead of parsing a
  // message. It never interprets them itself.
  describe('structured GraphQL errors', () => {
    const replaceDocument = 'mutation { replace }' as unknown as TypedDocumentNode<
      unknown,
      { data: { secret: string } }
    >;

    const rejectWith = async (error: unknown) => {
      mockRequest.mockRejectedValue(error);

      return service.mutation(replaceDocument, { data: { secret: 'variable-value' } }).catch((thrown) => thrown);
    };

    it('remains instanceof Error so existing callers keep working', async () => {
      const { ClientError } = await import('graphql-request');

      const thrown = await rejectWith(new ClientError('Not allowed'));

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).toBeInstanceOf(GraphqlError);
    });

    it('preserves the first GraphQL error message', async () => {
      const { ClientError } = await import('graphql-request');

      const thrown = await rejectWith(new ClientError('Not allowed'));

      expect(thrown.message).toBe('Not allowed');
    });

    it('retains the first error extensions verbatim without interpreting them', async () => {
      const { ClientError } = await import('graphql-request');
      const extensions = { type: 'STALE_SERVICE_CONFIGURATION', anythingElse: { nested: true } };

      const thrown = await rejectWith(new ClientError('Configuration changed', extensions));

      expect(thrown.extensions).toEqual(extensions);
      expect(thrown.extensions?.type).toBe('STALE_SERVICE_CONFIGURATION');
    });

    it('leaves extensions undefined when the GraphQL error carries none', async () => {
      const { ClientError } = await import('graphql-request');

      const thrown = await rejectWith(new ClientError('Not allowed'));

      expect(thrown.extensions).toBeUndefined();
    });

    it('exposes no token, headers, variables or request payload', async () => {
      const { ClientError } = await import('graphql-request');

      const thrown = await rejectWith(new ClientError('Not allowed', { type: 'SOMETHING' }));

      expect(thrown).not.toHaveProperty('request');
      expect(thrown).not.toHaveProperty('headers');
      expect(thrown).not.toHaveProperty('variables');
      expect(thrown).not.toHaveProperty('response');
      const carried = JSON.stringify({ message: thrown.message, extensions: thrown.extensions });

      expect(carried).not.toContain('test-token');
      expect(carried).not.toContain('variable-value');
    });

    it('rethrows a non-GraphQL error unchanged', async () => {
      const networkError = new Error('Network error');

      const thrown = await rejectWith(networkError);

      expect(thrown).toBe(networkError);
      expect(thrown).not.toBeInstanceOf(GraphqlError);
    });
  });
});
