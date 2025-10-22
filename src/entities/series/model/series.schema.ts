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
      imprintId
      imprint {
        imprintName
      }
      seriesUrl
      seriesDescription
    }
  }
`);

export const GET_SERIES_COUNT = graphql(`
  query GetSeriesCount($publishers: [Uuid!]!) {
    seriesCount(publishers: $publishers)
  }
`);

export const CREATE_SERIES = graphql(`
  mutation CreateSeries($data: NewSeries!) {
    createSeries(data: $data) {
      seriesId
    }
  }
`);

export const UPDATE_SERIES = graphql(`
  mutation UpdateSeries($data: PatchSeries!) {
    updateSeries(data: $data) {
      seriesId
    }
  }
`);

export const DELETE_SERIES = graphql(`
  mutation DeleteSeries($seriesId: Uuid!) {
    deleteSeries(seriesId: $seriesId) {
      seriesId
    }
  }
`);
