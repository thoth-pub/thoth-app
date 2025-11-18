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
import useWorkChapters from '../../api/hooks/useWorkChapters';

const useEditWorkHeader = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { work, updateWork } = useWork(workId, queryToken);
  const { chapters, refetchChapters } = useWorkChapters({ workId });
  const isPublicationDateDisabled = !isPublicationDateAvailable(work.status);
  const isWithdrawnDateRequired = isSupersededOrWithdrawn(work.status);
  const minDate = isPublicationDateShouldBeInFuture(work.status) ? getDateInFuture(0) : undefined;

  const changeWorkStatus = async (workStatus: WorkStatus) => {
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

    const promises = chapters.map(async (chapter) => {
      return updateWork({
        ...chapter,
        status: workStatus,
        publicationDate,
        withdrawnDate,
      });
    });

    await Promise.all(promises);

    refetchChapters();
  };

  const changePublicationDate = async (publicationDate: string) => {
    updateWork({
      ...work,
      publicationDate,
    });

    const promises = chapters.map(async (chapter) => {
      return updateWork({
        ...chapter,
        publicationDate,
      });
    });

    await Promise.all(promises);

    refetchChapters();
  };

  const changeWithdrawnDate = async (withdrawnDate: string) => {
    if (withdrawnDate.length === 0) return;

    updateWork({
      ...work,
      withdrawnDate,
    });

    const promises = chapters.map(async (chapter) => {
      return updateWork({
        ...chapter,
        withdrawnDate,
      });
    });

    await Promise.all(promises);

    refetchChapters();
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
