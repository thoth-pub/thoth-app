import { graphql } from '@/gql';

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

export const MOVE_ISSUE = graphql(`
  mutation MoveIssue($issueId: Uuid!, $newOrdinal: Int!) {
    moveIssue(issueId: $issueId, newOrdinal: $newOrdinal) {
      issueId
    }
  }
`);
