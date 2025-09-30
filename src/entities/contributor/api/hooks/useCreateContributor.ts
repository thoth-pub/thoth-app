import type { Contributor, CreateContributorMutation } from '@/gql/graphql';
import type { QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { CREATE_CONTRIBUTOR, GET_CONTRIBUTORS } from '../../model/contributor.schema';
import { ContributorEntity } from '../../model/contributor.types';

type UseCreateContributorProps = {
  queryToken: QueryToken;
  onCompleted?: (data: Contributor) => void;
  onError?: (error: Error) => void;
};

const mapper = new ContributorDtoMapper();

const useCreateContributor = (props: UseCreateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateContributorMutation>({
    queryToken,
    mutation: CREATE_CONTRIBUTOR,
    options: {
      onCompleted: (data) => {
        onCompleted?.(data.createContributor as Contributor);
      },
      onError: (error) => {
        onError?.(error);
      },
      refetchQueries: [{ query: GET_CONTRIBUTORS }],
    },
  });

  const createContributor = (
    contributor: Pick<ContributorEntity, 'firstName' | 'lastName' | 'fullName' | 'orcid' | 'website'>,
  ) => {
    const data = mapper.toDto(contributor);

    mutate({ variables: { data: data } });
  };

  return {
    createContributor,
    loading,
  };
};

export default useCreateContributor;
