'use client';

import {
  type BaseEditSectionProps,
  getDateInFuture,
  getDateInFutureFromDate,
  getMainTitle,
  isPublicationDateAvailable,
  isPublicationDateRequired,
  isPublicationDateShouldBeInFuture,
  isSupersededOrWithdrawn,
} from '@/src/shared';

import { useTranslatedWorks } from '../..';
import useWork from '../../api/hooks/useWork';
import useWorkChapters from '../../api/hooks/useWorkChapters';
import useWorkEditions from '../../api/hooks/useWorkEditions';
import useWorkTranslations from '../../api/hooks/useWorkTranslations';
import type { WorkStatus } from '../../model/work.types';

const useEditWorkHeader = ({ workId }: BaseEditSectionProps) => {
  const { work, updateWork } = useWork(workId);
  const { chapters } = useWorkChapters({ workId });
  const { latestEdition, previousEdition, nextEdition } = useWorkEditions(workId, work.edition ?? 1);
  const { translations } = useWorkTranslations(workId);
  const { translatedWorks } = useTranslatedWorks(workId);

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
  };

  return {
    title: getMainTitle(work.titles).title,
    id: work.reference,
    publicationDate: work.publicationDate,
    withdrawnDate: work.withdrawnDate,
    status: work.status,
    isPublicationDateDisabled,
    isWithdrawnDateRequired,
    minDate,
    latestEdition,
    previousEdition,
    nextEdition,
    translations,
    translatedWorks,
    changeWorkStatus,
    changePublicationDate,
    changeWithdrawnDate,
  };
};

export default useEditWorkHeader;
