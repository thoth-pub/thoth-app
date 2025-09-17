import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!) {
    createWork(data: $data) {
      workId
    }
  }
`);

export const CREATE_CONTRIBUTION = graphql(`
  mutation CreateContribution($data: NewContribution!) {
    createContribution(data: $data) {
      workId
    }
  }
`);
