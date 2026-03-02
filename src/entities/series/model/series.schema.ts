import { graphql } from '@/gql';

export const GET_SERIESES = graphql(`
  query GetSerieses(
    $publishers: [Uuid!]!
    $filter: String
    $offset: Int
    $limit: Int
    $direction: Direction = ASC
    $field: SeriesField = UPDATED_AT
    $seriesTypes: [SeriesType!]
  ) {
    serieses(
      publishers: $publishers
      filter: $filter
      offset: $offset
      limit: $limit
      order: { direction: $direction, field: $field }
      seriesTypes: $seriesTypes
    ) {
      seriesId
      seriesName
      seriesType
      issnPrint
      issnDigital
      updatedAt
      imprintId
      imprint {
        imprintName
      }
      seriesUrl
      seriesDescription
      issues {
        issueId
        issueOrdinal
        work {
          workId
          title
          coverUrl
        }
      }
    }
  }
`);

export const GET_SERIESES_COUNT = graphql(`
  query GetSeriesCount($publishers: [Uuid!]!, $filter: String) {
    seriesCount(publishers: $publishers, filter: $filter)
  }
`);

export const GET_SERIES = graphql(`
  query GetSeries($seriesId: Uuid!) {
    series(seriesId: $seriesId) {
      seriesId
      seriesName
      seriesType
      issnPrint
      issnDigital
      updatedAt
      imprintId
      imprint {
        imprintName
      }
      seriesUrl
      seriesDescription
      issues {
        issueId
        issueOrdinal
        work {
          workId
          title
          coverUrl
        }
      }
    }
  }
`);
