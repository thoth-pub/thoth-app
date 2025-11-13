import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { type QueryToken } from '@/src/shared';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_LANGUAGE } from '../../model/language.schema';

type UseDeleteLanguageProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const useDeleteLanguage = (props: UseDeleteLanguageProps) => {
  const { queryToken, workId = '' } = props;

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_LANGUAGE,
    options: {
      onError: (error) => {
        console.error(error);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
    },
  });

  const deleteLanguage = (languageId: string) => {
    mutate({
      variables: { languageId },
    });
  };

  return {
    deleteLanguage,
    loading,
  };
};

export default useDeleteLanguage;
