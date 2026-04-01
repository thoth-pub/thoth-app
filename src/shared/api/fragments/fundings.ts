import { graphql } from '@/gql';

export const FUNDING_FRAGMENT = graphql(`
  fragment FundingFragment on Funding {
    fundingId
    grantNumber
    institutionId
    program
    projectName
    projectShortname
    institution {
      institutionName
      ror
    }
  }
`);
