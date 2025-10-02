'use client';

import {
  type BaseEditSectionProps,
  getDateInFuture,
  isPublicationDateAvailable,
  isPublicationDateShouldBeInFuture,
} from '@/src/shared';

import useWork from '../../api/hooks/useWork';
import type { WorkStatusForm } from '../../model/work.types';

const useEditWorkHeader = ({ workId, queryToken }: BaseEditSectionProps) => {
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
