import { ServerError } from '@apollo/client';

import type { Contributor, CreateContributorMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { CREATE_CONTRIBUTOR, GET_CONTRIBUTORS } from '../../model/contributor.schema';
import { ContributorEntity } from '../../model/contributor.types';

type UseCreateContributorProps = {
  queryToken: QueryToken;
  onCompleted?: (data: Contributor) => void;
  onError?: (error: Error) => void;
};

const mapper = new ContributorDtoMapper();

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED } = NOTIFICATIONS;

const useCreateContributor = (props: UseCreateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateContributorMutation>({
    queryToken,
    mutation: CREATE_CONTRIBUTOR,
    options: {
      onCompleted: (data) => {
        sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);

        onCompleted?.(data.createContributor as Contributor);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, CONTRIBUTOR_CREATION_FAILED);

          sendErrorNotification(errorMessage);
          onError?.(error);
          return;
        }

        sendErrorNotification(CONTRIBUTOR_CREATION_FAILED);
        onError?.(error);
      },
      refetchQueries: 'all',
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
