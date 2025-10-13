import { graphql } from '@/gql';

export const CREATE_FUNDING = graphql(`
  mutation CreateFunding($data: NewFunding!) {
    createFunding(data: $data) {
      ...FundingFragment
    }
  }
`);
