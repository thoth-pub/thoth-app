'use client';

import {
  getDateInFuture,
  isPublicationDateAvailable,
  isPublicationDateShouldBeInFuture,
  type QueryToken,
} from '@/src/shared';

import useWork from '../../api/hooks/useWork';
import type { WorkId, WorkStatusForm } from '../../model/work.types';

type UseEditWorkHeaderProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const useEditWorkHeader = ({ workId, queryToken }: UseEditWorkHeaderProps) => {
  const { work, deleteWork, updateWork } = useWork(workId, queryToken);
  const isPublicationDateDisabled = !isPublicationDateAvailable(work.status);
  const minDate =
    isPublicationDateShouldBeInFuture(work.status) && !work.publicationDate ? getDateInFuture(0) : undefined;

  const changeWorkStatus = ({ workStatus }: WorkStatusForm) => {
    updateWork({
      ...work,
      status: workStatus,
    });
  };

  return { title: work.title, status: work.status, isPublicationDateDisabled, minDate, deleteWork, changeWorkStatus };
};

export default useEditWorkHeader;
