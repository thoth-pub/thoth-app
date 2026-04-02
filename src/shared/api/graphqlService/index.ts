import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import request, { ClientError, RequestDocument, Variables } from 'graphql-request';

import { getAuthorizationHeaders } from '../utils';

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
      const message = error.response.errors?.[0]?.message ?? error.message;
      throw new Error(message);
    }

    throw error;
  }
}
