'use client';

import type { TypedDocumentNode } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { Exact, InputMaybe, Scalars } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

type UseDataWithPaginationProps<QueryResult> = {
  query: TypedDocumentNode<
    QueryResult,
    Exact<{
      offset: Scalars['Int']['input'];
      limit?: InputMaybe<Scalars['Int']['input']>;
    }>
  >;
  filter: string;
  maxDataCount: number;
};

const useDataWithPagination = <QueryResult>({
  query,
  maxDataCount,
  filter,
}: UseDataWithPaginationProps<QueryResult>) => {
  const [offset, setOffset] = useState(0);

  const { data } = useSuspenseQuery<QueryResult>(query, {
    variables: {
      offset,
      limit: ITEMS_PER_PAGE,
      filter,
    },
  });

  const isFetchPrevDisabled = offset - ITEMS_PER_PAGE < 0;
  const isFetchNextDisabled = offset + ITEMS_PER_PAGE >= maxDataCount;

  const fetchNextPage = useCallback(() => {
    setOffset((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const fetchPreviousPage = useCallback(() => {
    if (isFetchPrevDisabled) return;

    setOffset((prev) => prev - ITEMS_PER_PAGE);
  }, [isFetchPrevDisabled]);

  const resetOffset = useCallback(() => {
    setOffset(0);
  }, []);

  return {
    data,
    offset,
    isFetchPrevDisabled,
    isFetchNextDisabled,
    fetchNextPage,
    fetchPreviousPage,
    resetOffset,
  };
};

export default useDataWithPagination;
