import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!) {
    createWork(data: $data) {
      workId
    }
  }
`);
