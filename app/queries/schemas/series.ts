import { graphql } from '@/gql';

export const GET_SERIES = graphql(`
  query GetSeries($publishers: [Uuid!]!) {
    serieses(publishers: $publishers) {
      seriesId
      seriesName
      seriesType
      issnPrint
      issnDigital
      updatedAt
    }
  }
`);
