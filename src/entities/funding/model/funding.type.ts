import type { FundingFragmentFragment } from '@/gql/graphql';

export type FundingDto = FundingFragmentFragment;

export type FundingId = string;

export type FundingEntity = {
  id: FundingId;
  grantNumber: string;
  institutionId: string;
  jurisdiction: string;
  program: string;
  projectName: string;
  projectShortname: string;
};
