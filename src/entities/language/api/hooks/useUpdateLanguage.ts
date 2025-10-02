import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { LanguageDtoMapper } from '../../model/language.mapper';
import { UPDATE_LANGUAGE } from '../../model/language.schema';
import { LanguageEntity } from '../../model/language.types';

type UseCreateLanguageProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const mapper = new LanguageDtoMapper();

const { LANGUAGE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateLanguage = (props: UseCreateLanguageProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_LANGUAGE,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
      onError: () => {
        sendErrorNotification(LANGUAGE_UPDATE_FAILED);
      },
    },
  });

  const updateLanguage = (data: LanguageEntity) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    updateLanguage,
    loading,
  };
};

export default useUpdateLanguage;
