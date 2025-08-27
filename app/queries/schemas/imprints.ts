import { graphql } from '@/gql';

export const GET_IMPRINTS = graphql(`
  query GetImprints($publishers: [Uuid!]!) {
    imprints(publishers: $publishers) {
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
