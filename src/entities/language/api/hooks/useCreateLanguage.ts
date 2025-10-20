import { ServerError } from '@apollo/client';

import type { CreateAffiliationMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { LanguageDtoMapper } from '../../model/language.mapper';
import { CREATE_LANGUAGE } from '../../model/language.schema';
import { LanguageEntity } from '../../model/language.types';

const { LANGUAGE_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new LanguageDtoMapper();

const useCreateLanguage = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_LANGUAGE,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, LANGUAGE_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(LANGUAGE_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createLanguage = (data: Omit<LanguageEntity, 'id'>) => {
    const { languageId, ...dto } = mapper.toDto({ ...data, id: '' });

    mutate({
      variables: { data: { ...dto, workId } },
    });
  };

  return {
    createLanguage,
    loading,
  };
};

export default useCreateLanguage;
