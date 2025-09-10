import { graphql } from '@/gql';

export const GET_BOOKS = graphql(`
  query GetBooks($publishers: [Uuid!]!) {
    books(publishers: $publishers) {
      ...WorkFragment
    }
  }
`);

export const GET_CHAPTERS = graphql(`
  query GetChapters($publishers: [Uuid!]!) {
    chapters(publishers: $publishers) {
      ...WorkFragment
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

export const UPDATE_WORK = graphql(`
  mutation UpdateWork($data: PatchWork!) {
    updateWork(data: $data) {
      ...WorkFragment
    }
  }
`);
