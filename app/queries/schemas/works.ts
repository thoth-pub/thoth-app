import { graphql } from '@/gql';

export const GET_WORKS = graphql(`
  query GetWorks($publishers: [Uuid!]!) {
    works(publishers: $publishers) {
      ...WorkFragment
    }
  }
`);

export const GET_WORK = graphql(`
  query GetWork($workId: Uuid!) {
    work(workId: $workId) {
      ...WorkFragment
    }
  }
`);
