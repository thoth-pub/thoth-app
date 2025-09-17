import type { CreateWorkMutation } from '@/gql/graphql';
import type { QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { CREATE_WORK } from '../../model/work.mutations';

type UseCreateWorkProps = {
  queryToken: QueryToken;
  onCompleted: (data: CreateWorkMutation) => void;
  onError: (error: Error) => void;
};

const useCreateWork = (props: UseCreateWorkProps) => {
  const { queryToken, onCompleted, onError } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateWorkMutation>({
    queryToken,
    mutation: CREATE_WORK,
    options: {
      onCompleted: (data) => {
        onCompleted(data);
      },
      onError: (error) => {
        onError(error);
      },
    },
  });

  return {
    createWork: mutate,
    loading,
  };
};

export default useCreateWork;
