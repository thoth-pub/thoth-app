import type { WorkEntity, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';

import { appConfig } from '../../config';
import { LanguageTypeAlt } from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { AbstractEntity, TitleEntity } from '../../types';

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

/**
 * The Work statuses a CSV bulk import refuses to execute (APP-CSV-D11-A, thoth-app#281): exactly the statuses the
 * pinned backend's `WorkProperties::is_published()` treats as published - ACTIVE, WITHDRAWN and SUPERSEDED.
 *
 * This is a temporary CSV bulk-import workflow safety restriction, not a Thoth domain or authorization rule: a CSV run
 * is not atomic, and a published Work it created cannot be reliably removed again if the run stops partway. These
 * statuses remain valid WorkStatus values; single-work editing, ONIX and the API are unaffected. The set is declared on
 * its own, rather than reusing `isPublicationDateRequired`, whose members happen to coincide today for another reason.
 */
export const CSV_BULK_IMPORT_BLOCKED_WORK_STATUSES: readonly WorkStatus[] = [
  WorkStatuses.enum.Active,
  WorkStatuses.enum.Withdrawn,
  WorkStatuses.enum.Superseded,
];

/**
 * Whether a CSV bulk import must refuse a Work with this canonical status (APP-CSV-D11-A). It reads the canonical enum
 * value only: an alias is resolved before it is asked, and an unrecognised value is never published.
 */
export const isCsvBulkImportBlockedStatus = (status: string): boolean =>
  (CSV_BULK_IMPORT_BLOCKED_WORK_STATUSES as readonly string[]).includes(status);

export const getDefaultWork = (data?: Partial<WorkEntity>): WorkEntity => {
  return {
    titles: [],
    abstracts: [],
    status: WorkStatuses.enum.Forthcoming,
    type: WorkTypes.enum.EditedBook,
    imprintId: '',
    license: '',
    edition: 1,
    id: appConfig.defaultId,
    updatedAt: '',
    doi: '',
    lccn: '',
    oclc: '',
    bibliographyNote: '',
    generalNote: '',
    publisherName: '',
    imprintName: '',
    place: '',
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
    reference: '',
    lastPage: '',
    firstPage: '',
    languages: [],
    publications: [],
    fundings: [],
    references: [],
    additionalResources: [],
    awards: [],
    bookReviews: [],
    endorsements: [],
    featuredVideo: null,
    subjects: [],
    issues: [],
    ...data,
  };
};

export const getDefaultChapter = (data?: Partial<Omit<WorkEntity, 'type'>>): WorkEntity => {
  return {
    ...getDefaultWork(),
    type: WorkTypes.enum.BookChapter,
    ...data,
  };
};

export const getDefaultTitle = (data?: Partial<TitleEntity>): TitleEntity => {
  return {
    id: appConfig.defaultId,
    canonical: false,
    title: '',
    subtitle: '',
    fullTitle: '',
    localeCode: LanguageTypeAlt.enum.En,
    ...data,
  };
};

export const getDefaultAbstract = (data?: Partial<AbstractEntity>): AbstractEntity => {
  return {
    id: appConfig.defaultId,
    canonical: false,
    type: AbstractTypes.enum.Long,
    content: '',
    localeCode: LanguageTypeAlt.enum.En,
    ...data,
  };
};

const UNTITLED = 'Untitled';

export const getMainTitle = (titles: TitleEntity[]) => {
  const defaultTitle = titles.length === 0 ? getDefaultTitle() : titles[0];
  const mainTitle = titles.find((title) => title.canonical);

  return mainTitle ?? defaultTitle;
};

export const getDisplayTitle = (titles: TitleEntity[]) => {
  const result = getMainTitle(titles);

  return {
    ...result,
    title: result.title || result.fullTitle || UNTITLED,
    fullTitle: result.fullTitle || result.title || UNTITLED,
  };
};

export const isTextContainsAnyMarkdownTag = (text: string): boolean => {
  const tagPattern = /<[^>]+>/;

  return tagPattern.test(text);
};
