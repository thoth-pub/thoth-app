import { graphql } from '@/gql';

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

export const MOVE_CONTRIBUTION = graphql(`
  mutation MoveContribution($contributionId: Uuid!, $newOrdinal: Int!) {
    moveContribution(contributionId: $contributionId, newOrdinal: $newOrdinal) {
      workId
    }
  }
`);

export const CREATE_BIOGRAPHY = graphql(`
  mutation CreateBiography($data: NewBiography!, $markupFormat: MarkupFormat!) {
    createBiography(data: $data, markupFormat: $markupFormat) {
      ...BiographyFragment
    }
  }
`);

export const UPDATE_BIOGRAPHY = graphql(`
  mutation UpdateBiography($data: PatchBiography!, $markupFormat: MarkupFormat!) {
    updateBiography(data: $data, markupFormat: $markupFormat) {
      ...BiographyFragment
    }
  }
`);

export const DELETE_BIOGRAPHY = graphql(`
  mutation DeleteBiography($biographyId: Uuid!) {
    deleteBiography(biographyId: $biographyId) {
      ...BiographyFragment
    }
  }
`);
