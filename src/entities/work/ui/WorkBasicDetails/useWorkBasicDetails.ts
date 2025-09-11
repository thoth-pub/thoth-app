'use client';

import { NOTIFICATIONS, type QueryToken, WorkStatuses, WorkTypes } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';
import { isBookChapter } from '@/src/shared/utils';

import useWork from '../../api/hooks/useWork';
import { GET_WORK, UPDATE_WORK } from '../../model/work.schema';
import type {
  CopyrightHolderForm,
  CoverUrlForm,
  EditionForm,
  ImprintForm,
  LandingPageForm,
  LicenseForm,
  WorkId,
  WorkType,
  WorkTypeForm,
} from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

type UseWorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useWorkBasicDetails = ({ workId, queryToken }: UseWorkBasicDetailsProps) => {
  const { work } = useWork(workId);
  const defaultValues = {
    workId,
    workStatus: work?.status ?? WorkStatuses.enum.Forthcoming,
    title: work?.title ?? '',
    fullTitle: work?.fullTitle ?? '',
    imprintId: work?.imprintId ?? '',
    workType: work?.type ?? WorkTypes.enum.BookChapter,
    edition: work?.edition ?? null,
    license: work?.license ?? null,
    copyrightHolder: work?.copyrightHolder ?? null,
    landingPage: work?.landingPage ?? null,
    coverUrl: work?.coverUrl ?? null,
  };

  const { sendErrorNotification } = useNotifications();
  const [mutate, { loading }] = useMutationWithAuth({
    queryToken,
    mutation: UPDATE_WORK,
    options: {
      onError: () => {
        sendErrorNotification(WORK_UPDATE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId: workId } }],
    },
  });

  const changeWorkType = ({ workType }: WorkTypeForm) => {
    const { edition, ...restFields } = defaultValues;
    const defaultEdition = edition ?? 1;

    mutate({
      variables: {
        data: {
          ...restFields,
          edition: isBookChapter(workType as WorkType) ? null : defaultEdition,
          workType: workType as WorkType,
        },
      },
    });
  };

  const changeEdition = ({ edition }: EditionForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, edition },
      },
    });
  };

  const changeImprint = ({ imprintId }: ImprintForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, imprintId },
      },
    });
  };

  const changeLicense = ({ license }: LicenseForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, license },
      },
    });
  };

  const changeCopyrightHolder = ({ copyrightHolder }: CopyrightHolderForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, copyrightHolder },
      },
    });
  };

  const changeLandingPage = ({ landingPage }: LandingPageForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, landingPage },
      },
    });
  };

  const changeCoverUrl = ({ coverUrl }: CoverUrlForm) => {
    mutate({
      variables: {
        data: { ...defaultValues, coverUrl },
      },
    });
  };

  return {
    changeWorkType,
    changeEdition,
    changeImprint,
    changeLicense,
    changeCopyrightHolder,
    changeLandingPage,
    changeCoverUrl,
    loading,
    work,
  };
};
