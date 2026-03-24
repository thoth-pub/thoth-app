import { graphql } from '@/gql';

export const GET_IMPRINTS_COUNT = graphql(`
  query GetImprintsCount($publishers: [Uuid!]!) {
    imprintCount(publishers: $publishers)
  }
`);

export const GET_IMPRINTS = graphql(`
  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {
    imprints(offset: $offset, limit: $limit, publishers: $publishers) {
      imprintId
      imprintName
      imprintUrl
      updatedAt
      crossmarkDoi
      defaultCurrency
      defaultLocale
      defaultPlace
      s3Bucket
      cdnDomain
      cloudfrontDistId
      publisher {
        publisherName
      }
    }
  }
`);
