'use client';

import { useMutation } from '@apollo/client/react';

import { httpLink, NOTIFICATIONS, type QueryToken, setAuthorizationHeader, WorkTypes } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { UPDATE_WORK } from '../../model/work.schema';
import type { WorkEntity, WorkType, WorkTypeForm } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

type UseWorkBasicDetailsProps = {
  work: WorkEntity;
  queryToken: QueryToken;
};

export const useWorkBasicDetails = ({ work, queryToken }: UseWorkBasicDetailsProps) => {
  const { id: workId, title, type: workType, imprintId, status: workStatus, edition } = work;
  const defaultEdition = edition ?? 1;
  const minimalRequiredFields = {
    workId,
    fullTitle: title,
    title,
    workType,
    imprintId,
    workStatus,
  };
  const { sendErrorNotification } = useNotifications();
  const [mutate, { client, loading }] = useMutation(UPDATE_WORK, {
    onError: () => {
      sendErrorNotification(WORK_UPDATE_FAILED);
    },
  });

  client.setLink(setAuthorizationHeader(queryToken).concat(httpLink));

  const submitWorkType = ({ workType }: WorkTypeForm) => {
    mutate({
      variables: {
        data: {
          ...minimalRequiredFields,
          edition: workType !== WorkTypes.enum.BookChapter && !edition ? defaultEdition : edition,
          workType: workType as WorkType,
        },
      },
    });
  };

  return {
    submitWorkType,
    loading,
  };
};
