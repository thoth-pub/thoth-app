'use client';

import type { DocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { httpLink, setAuthorizationHeader } from '../api/client';

type UseMutationWithAuthProps<T> = {
  queryToken: string;
  mutation: DocumentNode;
  options: useMutation.Options<T>;
};

const useMutationWithAuth = <T>(props: UseMutationWithAuthProps<T>) => {
  const { queryToken, mutation, options } = props;

  const [mutate, { client, ...rest }] = useMutation<T>(mutation, options);

  client.setLink(setAuthorizationHeader(queryToken).concat(httpLink));

  return [mutate, { client, ...rest }] as const;
};

export default useMutationWithAuth;
