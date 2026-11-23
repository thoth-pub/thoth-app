import type { ContributionType } from '@/gql/graphql';

export type AdminContributor = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  orcid: string;
  website: string;
};

export type AdminCredit = {
  contributionId: string;
  contributorId: string;
  workId: string;
  contributionType: ContributionType;
  mainContribution: boolean;
  firstName: string | null;
  lastName: string;
  fullName: string;
  contributionOrdinal: number;
  workTitle: string;
  publisherName: string;
};

export type MergeCreditStatus = 'moved' | 'skipped' | 'failed';

export type MergeCreditResult = {
  contributionId: string;
  workId: string;
  status: MergeCreditStatus;
  error?: string;
};

// Why a merge stopped. `deleted` is the only state in which the duplicate is gone.
export type MergeOutcome =
  | { state: 'deleted'; results: MergeCreditResult[] }
  | {
      state: 'incomplete';
      reason: 'credit-failed' | 'credits-remain' | 'read-failed' | 'delete-failed';
      results: MergeCreditResult[];
      error?: string;
    };

// What the preview shows before anything is written.
export type MergePreview = {
  credits: AdminCredit[];
  // Credits of the duplicate on works that already credit the survivor: not moved automatically.
  conflictingWorkIds: string[];
};
