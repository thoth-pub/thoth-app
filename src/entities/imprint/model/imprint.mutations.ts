import { graphql } from '@/gql';

export const CREATE_IMPRINT = graphql(`
  mutation CreateImprint($data: NewImprint!) {
    createImprint(data: $data) {
      imprintId
    }
  }
`);

export const UPDATE_IMPRINT = graphql(`
  mutation UpdateImprint($data: PatchImprint!) {
    updateImprint(data: $data) {
      imprintId
      imprintName
      imprintUrl
      updatedAt
      publisher {
        publisherName
      }
    }
  }
`);

export const DELETE_IMPRINT = graphql(`
  mutation DeleteImprint($imprintId: Uuid!) {
    deleteImprint(imprintId: $imprintId) {
      imprintId
    }
  }
`);
