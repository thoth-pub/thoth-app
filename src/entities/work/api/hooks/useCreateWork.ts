import { ServerError } from '@apollo/client';

import { type CreateWorkMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useBulkRefetchQueries, useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { CREATE_WORK } from '../../model/work.mutations';
import { WorkDto, WorkEntity } from '../../model/work.types';
import { WorkDtoMapper } from '../../model/work.mapper';

type UseCreateWorkProps = {
  queryToken: QueryToken;
  onCompleted: (data: WorkEntity) => void;
};

const { WORK_CREATION_SUCCESS, WORK_CREATION_FAILED } = NOTIFICATIONS;

const workDtoMapper = new WorkDtoMapper();

const useCreateWork = (props: UseCreateWorkProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const queriesToRefetch = useBulkRefetchQueries();

  const [mutate, { loading }] = useMutationWithAuth<CreateWorkMutation>({
    queryToken,
    mutation: CREATE_WORK,
    options: {
      onCompleted: (data) => {
        sendSuccessNotification(WORK_CREATION_SUCCESS);

        const work = workDtoMapper.toEntity(data.createWork as WorkDto);

        onCompleted(work);
      },
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, WORK_CREATION_FAILED);

          sendErrorNotification(errorMessage);
          return;
        }

        sendErrorNotification(WORK_CREATION_FAILED);
      },
      refetchQueries: queriesToRefetch,
    },
  });

  const createWork = (data: WorkEntity) => {
    const { workId, ...work } = workDtoMapper.toDto(data) as WorkDto;

    mutate({ variables: { data: work } });
  };

  return {
    createWork,
    loading,
  };
};

export default useCreateWork;
