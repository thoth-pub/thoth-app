import { ServerError } from '@apollo/client';

import type { Contributor, UpdateContributorMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, type QueryToken,serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { ContributorDtoMapper } from '../../model/contributor.mapper';
import { GET_CONTRIBUTOR, GET_CONTRIBUTORS, UPDATE_CONTRIBUTOR } from '../../model/contributor.schema';
import type { ContributorEntity, ContributorId } from '../../model/contributor.types';

type UseUpdateContributorProps = {
  queryToken: QueryToken;
  workId?: WorkId;
  contributorId?: ContributorId;
  onCompleted?: (data: Contributor) => void;
  onError?: (error: Error) => void;
};

const mapper = new ContributorDtoMapper();

const { CONTRIBUTOR_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateContributor = (props: UseUpdateContributorProps) => {
  const { queryToken, workId = '', contributorId = '', onCompleted, onError } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<UpdateContributorMutation>({
    queryToken,
    mutation: UPDATE_CONTRIBUTOR,
    options: {
      onCompleted: (data) => {
        onCompleted?.(data.updateContributor as Contributor);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, CONTRIBUTOR_UPDATE_FAILED);

          sendErrorNotification(errorMessage);
          onError?.(error);
          return;
        }

        sendErrorNotification(CONTRIBUTOR_UPDATE_FAILED);
        onError?.(error);
      },
      refetchQueries: [
        { query: GET_CONTRIBUTORS },
        { query: GET_WORK, variables: { workId } },
        { query: GET_CONTRIBUTOR, variables: { contributorId: contributorId } },
      ],
    },
  });

  const updateContributor = (
    contributor: Pick<ContributorEntity, 'id' | 'firstName' | 'lastName' | 'fullName' | 'orcid' | 'website'>,
  ) => {
    const data = mapper.toDto(contributor);

    mutate({ variables: { data: data } });
  };

  return {
    updateContributor,
    loading,
  };
};

export default useUpdateContributor;
