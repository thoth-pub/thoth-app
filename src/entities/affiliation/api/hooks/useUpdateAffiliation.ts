import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { type QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { UPDATE_AFFILIATION } from '../../model/affiliation.schema';

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const useUpdateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken, workId = '' } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_AFFILIATION,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    updateAffiliation: mutate,
    loading,
  };
};

export default useUpdateAffiliation;
