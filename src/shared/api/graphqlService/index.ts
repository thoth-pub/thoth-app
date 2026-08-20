import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import request, { ClientError, RequestDocument, Variables } from 'graphql-request';

import { getAuthorizationHeaders } from '../utils';

// Opaque, server-returned GraphQL error extensions. This transport layer never
// interprets them: it only carries them so a feature-specific caller can read a
// stable backend classification (e.g. `extensions.type`) instead of parsing a
// human-readable message.
export type GraphqlErrorExtensions = Record<string, unknown>;

// Backwards-compatible error for GraphQL responses that carry errors. It keeps
// the first error's message, which is what every existing caller already relies
// on, and remains an `Error`. Nothing about the request (URL, headers, bearer
// token, variables or full payload) is captured or logged here.
export class GraphqlError extends Error {
  readonly extensions?: GraphqlErrorExtensions;

  constructor(message: string, extensions?: GraphqlErrorExtensions) {
    super(message);
    this.name = 'GraphqlError';
    this.extensions = extensions;
  }
}

export class GraphqlService {
  constructor(private readonly token: string) {
    this.token = token;
  }

  async query<TResult, TVariables extends Variables>(
    query: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const headers = getAuthorizationHeaders(this.token);

    try {
      return await request<TResult>(
        process.env.NEXT_PUBLIC_THOTH_API_URL ?? '',
        query as RequestDocument,
        variables as Variables,
        headers,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async mutation<TResult, TVariables extends Variables>(
    mutation: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const headers = getAuthorizationHeaders(this.token);

    try {
      return await request<TResult>(
        process.env.NEXT_PUBLIC_THOTH_API_URL ?? '',
        mutation as RequestDocument,
        variables as Variables,
        headers,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof ClientError) {
      const firstError = error.response.errors?.[0];
      const message = firstError?.message ?? error.message;

      throw new GraphqlError(message, firstError?.extensions as GraphqlErrorExtensions | undefined);
    }

    throw error;
  }
}
