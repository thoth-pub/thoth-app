import { graphql } from '@/gql';

export const WORK_FRAGMENT = graphql(`
  fragment WorkFragment on Work {
    doi
    workId
    title
    workType
    updatedAt
    contributions {
      fullName
    }
    imprint {
      publisher {
        publisherName
      }
    }
    imprintId
    workStatus
    edition
  }
`);
