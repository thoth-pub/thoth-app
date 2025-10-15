'use client';

import {
  type BaseEditSectionProps,
  getDateInFuture,
  isPublicationDateAvailable,
  isPublicationDateRequired,
  isPublicationDateShouldBeInFuture,
  isSupersededOrWithdrawn,
} from '@/src/shared';

import useWork from '../../api/hooks/useWork';
import type { WorkStatus } from '../../model/work.types';

const useEditWorkHeader = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { work, updateWork } = useWork(workId, queryToken);
  const isPublicationDateDisabled = !isPublicationDateAvailable(work.status);
  const isWithdrawnDateRequired = isSupersededOrWithdrawn(work.status);
  const minDate =
    isPublicationDateShouldBeInFuture(work.status) && !work.publicationDate ? getDateInFuture(0) : undefined;

  const changeWorkStatus = (workStatus: WorkStatus) => {
    const isPublicationDateDisabled = !isPublicationDateAvailable(workStatus);
    const isDateRequired = isPublicationDateRequired(workStatus);
    const isWithdrawnDateRequired = isSupersededOrWithdrawn(workStatus);

    let publicationDate = isPublicationDateDisabled ? null : work.publicationDate;
    let withdrawnDate = isWithdrawnDateRequired ? work.withdrawnDate : null;

    if (isDateRequired && !publicationDate) {
      publicationDate = new Date().toISOString();
    }

    if (isWithdrawnDateRequired && !work.withdrawnDate) {
      withdrawnDate = getDateInFuture(1);
    }

    updateWork({
      ...work,
      status: workStatus,
      publicationDate,
      withdrawnDate,
    });
  };

  return {
    title: work.title,
    id: work.reference,
    publicationDate: work.publicationDate,
    status: work.status,
    isPublicationDateDisabled,
    isWithdrawnDateRequired,
    minDate,
    changeWorkStatus,
  };
};

export default useEditWorkHeader;
