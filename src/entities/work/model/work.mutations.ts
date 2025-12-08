import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!) {
    createWork(data: $data) {
      ...WorkFragment
    }
  }
`);

export const MOVE_WORK_RELATION = graphql(`
  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {
    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {
      workRelationId
    }
  }
`);
