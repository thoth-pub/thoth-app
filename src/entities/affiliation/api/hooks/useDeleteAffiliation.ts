import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { type QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_AFFILIATION } from '../../model/affiliation.schema';

type UseDeleteAffiliationProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const useDeleteAffiliation = (props: UseDeleteAffiliationProps) => {
  const { queryToken, workId = '' } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_AFFILIATION,
    options: {
      onError: (error) => {
        console.error(error);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    deleteAffiliation: mutate,
    loading,
  };
};

export default useDeleteAffiliation;
