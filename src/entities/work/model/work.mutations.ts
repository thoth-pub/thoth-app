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
      contributionId
    }
  }
`);

export const DELETE_CONTRIBUTION = graphql(`
  mutation DeleteContribution($contributionId: Uuid!) {
    deleteContribution(contributionId: $contributionId) {
      workId
    }
  }
`);

export const UPDATE_CONTRIBUTION = graphql(`
  mutation UpdateContribution($data: PatchContribution!) {
    updateContribution(data: $data) {
      workId
    }
  }
`);
