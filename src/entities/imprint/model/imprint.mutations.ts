import { graphql } from '@/gql';

export const CREATE_IMPRINT = graphql(`
  mutation CreateImprint($data: NewImprint!) {
    createImprint(data: $data) {
      imprintId
    }
  }
`);
