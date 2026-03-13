import { graphql } from '@/gql';

export const ENDORSEMENT_FRAGMENT = graphql(`
  fragment EndorsementFragment on Endorsement {
    endorsementId
    workId
    authorName
    authorRole
    url
    text
    endorsementOrdinal
  }
`);
