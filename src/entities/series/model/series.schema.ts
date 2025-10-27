import { graphql } from '@/gql';

export const GET_SERIES = graphql(`
  query GetSeries($publishers: [Uuid!]!, $filter: String) {
    serieses(publishers: $publishers, filter: $filter) {
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
        }
      }
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

export const CREATE_ISSUE = graphql(`
  mutation CreateIssue($data: NewIssue!) {
    createIssue(data: $data) {
      issueId
    }
  }
`);

export const UPDATE_ISSUE = graphql(`
  mutation UpdateIssue($data: PatchIssue!) {
    updateIssue(data: $data) {
      issueId
      issueOrdinal
      seriesId
      workId
    }
  }
`);

export const DELETE_ISSUE = graphql(`
  mutation DeleteIssue($issueId: Uuid!) {
    deleteIssue(issueId: $issueId) {
      issueId
    }
  }
`);
