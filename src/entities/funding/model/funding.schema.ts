import { graphql } from '@/gql';

export const CREATE_FUNDING = graphql(`
  mutation CreateFunding($data: NewFunding!) {
    createFunding(data: $data) {
      ...FundingFragment
    }
  }
`);

export const UPDATE_FUNDING = graphql(`
  mutation UpdateFunding($data: PatchFunding!) {
    updateFunding(data: $data) {
      ...FundingFragment
    }
  }
`);

export const DELETE_FUNDING = graphql(`
  mutation DeleteFunding($fundingId: Uuid!) {
    deleteFunding(fundingId: $fundingId) {
      ...FundingFragment
    }
  }
`);
