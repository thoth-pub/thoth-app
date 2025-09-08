import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks($publishers: [Uuid!]!) {
    books(publishers: $publishers) {
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
    }
  }
`);

export const GET_CHAPTERS = graphql(`
  query GetChapters($publishers: [Uuid!]!) {
    chapters(publishers: $publishers) {
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
    }
  }
`);

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
