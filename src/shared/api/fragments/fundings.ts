import { graphql } from '@/gql';

export const FUNDING_FRAGMENT = graphql(`
  fragment FundingFragment on Funding {
    fundingId
    grantNumber
    institutionId
    jurisdiction
    program
    projectName
    projectShortname
  }
`);
