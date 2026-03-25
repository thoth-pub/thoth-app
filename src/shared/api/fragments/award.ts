import { graphql } from '@/gql';

export const AWARD_FRAGMENT = graphql(`
  fragment AwardFragment on Award {
    awardId
    workId
    title
    url
    category
    role
    prizeStatement
    awardOrdinal
    jury
    year
    country
  }
`);
