import type { WorkEntity, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';

import { appConfig } from '../../config';

export const isBookChapter = (workType: WorkType) => workType === WorkTypes.enum.BookChapter;

export const isWorkCancelled = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Cancelled;

export const isWorkPostponed = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.PostponedIndefinitely;

export const isWorkActive = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Active;

export const isWorkForthcoming = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Forthcoming;

export const isWorkSuperseded = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Superseded;

export const isWorkWithdrawn = (workStatus: WorkStatus) => workStatus === WorkStatuses.enum.Withdrawn;

export const isPublicationDateAvailable = (workStatus: WorkStatus) =>
  !isWorkCancelled(workStatus) && !isWorkPostponed(workStatus);

export const isSupersededOrWithdrawn = (workStatus: WorkStatus) =>
  isWorkSuperseded(workStatus) || isWorkWithdrawn(workStatus);

export const isPublicationDateRequired = (workStatus: WorkStatus) => {
  return isWorkActive(workStatus) || isSupersededOrWithdrawn(workStatus);
};

export const isPublicationDateShouldBeInFuture = (workStatus: WorkStatus) => isWorkForthcoming(workStatus);

export const getDefaultChapter = (data?: Partial<Omit<WorkEntity, 'type'>>): WorkEntity => {
  return {
    id: appConfig.defaultId,
    title: '',
    subtitle: '',
    fullTitle: '',
    type: WorkTypes.enum.BookChapter,
    updatedAt: '',
    contributorsNames: [],
    doi: '',
    lccn: '',
    oclc: '',
    bibliographyNote: '',
    generalNote: '',
    publisherName: '',
    imprintId: '',
    status: WorkStatuses.enum.Forthcoming,
    edition: 0,
    license: '',
    copyrightHolder: '',
    landingPage: '',
    publicationDate: '',
    withdrawnDate: '',
    shortAbstract: '',
    longAbstract: '',
    relationId: null,
    contributions: [],
    imageCount: 0,
    tableCount: 0,
    audioCount: 0,
    videoCount: 0,
    pageCount: 0,
    firstPage: '',
    lastPage: '',
    frontmatterCount: 0,
    backmatterCount: 0,
    languages: [],
    publications: [],
    fundings: [],
    references: [],
    subjects: [],
    issues: [],
    ...data,
  };
};

export const getDefaultWork = (data?: Partial<WorkEntity>): WorkEntity => {
  return {
    title: '',
    fullTitle: '',
    status: WorkStatuses.enum.Forthcoming,
    type: WorkTypes.enum.EditedBook,
    imprintId: '',
    license: '',
    edition: 1,
    id: '',
    subtitle: '',
    updatedAt: '',
    contributorsNames: [],
    doi: '',
    lccn: '',
    oclc: '',
    bibliographyNote: '',
    generalNote: '',
    publisherName: '',
    shortAbstract: '',
    longAbstract: '',
    publicationDate: null,
    withdrawnDate: null,
    relationId: null,
    contributions: [],
    imageCount: 0,
    tableCount: 0,
    audioCount: 0,
    videoCount: 0,
    pageCount: 0,
    frontmatterCount: 0,
    backmatterCount: 0,
    lastPage: '',
    firstPage: '',
    languages: [],
    publications: [],
    fundings: [],
    references: [],
    subjects: [],
    issues: [],
    ...data,
  };
};
