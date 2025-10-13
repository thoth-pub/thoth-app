'use client';

import { useRouter } from 'next/navigation';

import {
  type BaseEditSectionProps,
  getDateInFuture,
  isPublicationDateAvailable,
  isPublicationDateShouldBeInFuture,
  ROUTES,
} from '@/src/shared';

import useWork from '../../api/hooks/useWork';
import type { WorkStatusForm } from '../../model/work.types';

const useEditWorkHeader = ({ workId, queryToken }: BaseEditSectionProps) => {
  const router = useRouter();
  const { work, deleteWork: deleteWorkMutation, updateWork } = useWork(workId, queryToken);
  const isPublicationDateDisabled = !isPublicationDateAvailable(work.status);
  const minDate =
    isPublicationDateShouldBeInFuture(work.status) && !work.publicationDate ? getDateInFuture(0) : undefined;

  const changeWorkStatus = ({ workStatus }: WorkStatusForm) => {
    updateWork({
      ...work,
      status: workStatus,
    });
  };

  const deleteWork = (id: string) => {
    deleteWorkMutation(id);
    router.push(ROUTES.WORKS);
  };

  return { title: work.title, status: work.status, isPublicationDateDisabled, minDate, deleteWork, changeWorkStatus };
};

export default useEditWorkHeader;
