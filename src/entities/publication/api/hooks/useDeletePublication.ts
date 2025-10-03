import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_PUBLICATION } from '../../model/publication.schema';

const useDeleteAffiliation = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_PUBLICATION,
    options: {
      onError: (error) => {
        console.error(error);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  return {
    deletePublication: mutate,
    loading,
  };
};

export default useDeleteAffiliation;
