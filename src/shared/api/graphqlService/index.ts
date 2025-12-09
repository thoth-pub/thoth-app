import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import request, { RequestDocument, Variables } from 'graphql-request';

import { getAuthorizationHeaders } from '../utils';

export class GraphqlService {
  async query<TResult, TVariables extends Variables>(
    query: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    return request<TResult>(
      process.env.NEXT_PUBLIC_THOTH_API_URL ?? '',
      query as RequestDocument,
      variables as Variables,
    );
  }

  async mutation<TResult, TVariables extends Variables>(
    token: string,
    mutation: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const headers = getAuthorizationHeaders(token);

    return request<TResult>(
      process.env.NEXT_PUBLIC_THOTH_API_URL ?? '',
      mutation as RequestDocument,
      variables as Variables,
      headers,
    );
  }
}
