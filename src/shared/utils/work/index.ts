import type { WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';

export const isBookChapter = (workType: WorkType) => workType === WorkTypes.enum.BookChapter;

export const isWorkCancelled = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Cancelled;

export const isWorkPostponed = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.PostponedIndefinitely;

export const isWorkActive = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Active;

export const isWorkForthcoming = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Forthcoming;

export const isWorkSuperseded = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Superseded;

export const isWorkWithdrawn = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Withdrawn;

export const isPublicationDateAvailable = (workStatus: WorkStatus) =>
  !isWorkCancelled(workStatus) && !isWorkPostponed(workStatus);

export const isPublicationDateRequired = (workStatus: WorkStatus) => {
  return isWorkActive(workStatus) || isWorkWithdrawn(workStatus) || isWorkSuperseded(workStatus);
};

export const isPublicationDateShouldBeInFuture = (workStatus: WorkStatus) => isWorkForthcoming(workStatus);
