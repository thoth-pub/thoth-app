import { graphql } from '@/gql';

export const GET_WORKS = graphql(`
  query GetWorks(
    $offset: Int!
    $limit: Int
    $publishers: [Uuid!]!
    $direction: Direction = ASC
    $field: WorkField = UPDATED_AT_WITH_RELATIONS
    $workStatus: WorkStatus
    $filter: String
    $workTypes: [WorkType!]
  ) {
    works(
      offset: $offset
      limit: $limit
      publishers: $publishers
      order: { direction: $direction, field: $field }
      workStatus: $workStatus
      filter: $filter
      workTypes: $workTypes
    ) {
      ...WorkFragment
    }
  }
`);

export const GET_WORK = graphql(`
  query GetWork($workId: Uuid!) {
    work(workId: $workId) {
      ...WorkFragment
    }
  }
`);

export const UPDATE_WORK = graphql(`
  mutation UpdateWork($data: PatchWork!) {
    updateWork(data: $data) {
      ...WorkFragment
    }
  }
`);

export const DELETE_WORK = graphql(`
  mutation DeleteWork($workId: Uuid!) {
    deleteWork(workId: $workId) {
      workId
    }
  }
`);

export const GET_WORKS_COUNT = graphql(`
  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {
    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)
  }
`);

export const GET_WORK_CHAPTERS = graphql(`
  query GetWorkChapters($workId: Uuid!, $limit: Int, $offset: Int) {
    work(workId: $workId) {
      relations(
        relationTypes: HAS_CHILD
        limit: $limit
        offset: $offset
        order: { direction: ASC, field: RELATION_ORDINAL }
      ) {
        workRelationId
        relatedWork {
          ...WorkFragment
        }
      }
    }
  }
`);

export const CREATE_WORK_RELATION = graphql(`
  mutation CreateWorkRelation($data: NewWorkRelation!) {
    createWorkRelation(data: $data) {
      workRelationId
    }
  }
`);
