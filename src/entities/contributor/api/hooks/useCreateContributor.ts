import type { CreateContributorMutation } from '@/gql/graphql';
import type { QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { CREATE_CONTRIBUTOR, GET_CONTRIBUTORS } from '../../model/contributor.schema';

type UseCreateContributorProps = {
  queryToken: QueryToken;
  onCompleted: (data: CreateContributorMutation) => void;
  onError: (error: Error) => void;
};

const mapper = new ContributorDtoMapper();

const useCreateContributor = (props: UseCreateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateContributorMutation>({
    queryToken,
    mutation: CREATE_CONTRIBUTOR,
    options: {
      onCompleted: (data) => {
        onCompleted(data);
      },
      onError: (error) => {
        onError(error);
      },
      refetchQueries: [{ query: GET_CONTRIBUTORS }],
    },
  });

  return {
    createContributor: mutate,
    toEntity: mapper.toEntity,
    loading,
  };
};

export default useCreateContributor;
