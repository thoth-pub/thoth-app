'use client';

import type { TypedDocumentNode } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { config } from '@/config';
import { Exact, InputMaybe, Scalars } from '@/gql/graphql';
import { BaseMapper } from '@/interfaces';

const ITEMS_PER_PAGE = config.data.itemsPerRequestLimit;

type UseDataWithPaginationProps<QueryResult, DataDto, DataEntity> = {
  query: TypedDocumentNode<
    QueryResult,
    Exact<{
      offset: Scalars['Int']['input'];
      limit?: InputMaybe<Scalars['Int']['input']>;
    }>
  >;
  maxDataCount: number;
  dtoMapper: BaseMapper<DataEntity, DataDto>;
};

export const useDataWithPagination = <QueryResult, DataDto, DataEntity>({
  query,
  maxDataCount,
  dtoMapper,
}: UseDataWithPaginationProps<QueryResult, DataDto, DataEntity>) => {
  const [offset, setOffset] = useState(0);

  const { data } = useSuspenseQuery(query, {
    variables: {
      offset,
      limit: ITEMS_PER_PAGE,
    },
  });

  const mappedData = Array.isArray(data)
    ? data.map(dtoMapper.toEntity)
    : [dtoMapper.toEntity(data as unknown as DataDto)];

  const isFetchPrevDisabled = offset - ITEMS_PER_PAGE < 0;
  const isFetchNextDisabled = offset + ITEMS_PER_PAGE >= maxDataCount;

  const fetchNextPage = useCallback(() => {
    setOffset((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const fetchPreviousPage = useCallback(() => {
    if (isFetchPrevDisabled) return;

    setOffset((prev) => prev - ITEMS_PER_PAGE);
  }, [isFetchPrevDisabled]);

  return {
    data: mappedData,
    isFetchPrevDisabled,
    isFetchNextDisabled,
    fetchNextPage,
    fetchPreviousPage,
  };
};
