'use client';

import {
  type BaseEditSectionProps,
  getDateInFuture,
  getDateInFutureFromDate,
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
  const minDate = isPublicationDateShouldBeInFuture(work.status) ? getDateInFuture(0) : undefined;

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
      withdrawnDate = getDateInFutureFromDate(publicationDate ?? getDateInFuture(1));
    }

    updateWork({
      ...work,
      status: workStatus,
      publicationDate,
      withdrawnDate,
    });
  };

  const changePublicationDate = (publicationDate: string) => {
    updateWork({
      ...work,
      publicationDate,
    });
  };

  const changeWithdrawnDate = (withdrawnDate: string) => {
    if (withdrawnDate.length === 0) return;

    updateWork({
      ...work,
      withdrawnDate,
    });
  };

  return {
    title: work.title,
    id: work.reference,
    publicationDate: work.publicationDate,
    withdrawnDate: work.withdrawnDate,
    status: work.status,
    isPublicationDateDisabled,
    isWithdrawnDateRequired,
    minDate,
    changeWorkStatus,
    changePublicationDate,
    changeWithdrawnDate,
  };
};

export default useEditWorkHeader;
