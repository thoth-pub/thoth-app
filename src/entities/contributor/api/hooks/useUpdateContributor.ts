import type { Contributor, UpdateContributorMutation } from '@/gql/graphql';
import type { QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { GET_CONTRIBUTORS, UPDATE_CONTRIBUTOR } from '../../model/contributor.schema';

type UseUpdateContributorProps = {
  queryToken: QueryToken;
  onCompleted: (data: Contributor) => void;
  onError: (error: Error) => void;
};

const mapper = new ContributorDtoMapper();

const useUpdateContributor = (props: UseUpdateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const [mutate, { loading }] = useMutationWithAuth<UpdateContributorMutation>({
    queryToken,
    mutation: UPDATE_CONTRIBUTOR,
    options: {
      onCompleted: (data) => {
        onCompleted(data.updateContributor as Contributor);
      },
      onError: (error) => {
        onError(error);
      },
      refetchQueries: [{ query: GET_CONTRIBUTORS }],
    },
  });

  return {
    updateContributor: mutate,
    toEntity: mapper.toEntity,
    loading,
  };
};

export default useUpdateContributor;
