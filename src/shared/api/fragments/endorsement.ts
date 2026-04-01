import { graphql } from '@/gql';

export const ENDORSEMENT_FRAGMENT = graphql(`
  fragment EndorsementFragment on Endorsement {
    endorsementId
    workId
    authorName
    authorOrcid
    authorRole
    authorInstitutionId
    authorInstitution {
      institutionId
      institutionName
      ror
    }
    url
    text
    endorsementOrdinal
  }
`);
