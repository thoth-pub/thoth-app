import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {
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

/**
 * Deletes one Work relation by its id, returning that id (thoth-app#187): how a bulk import removes a relation its own
 * failed execution unit created between two Works that unit did not create, and proves it removed exactly that one.
 */
export const DELETE_WORK_RELATION = graphql(`
  mutation DeleteWorkRelation($workRelationId: Uuid!) {
    deleteWorkRelation(workRelationId: $workRelationId) {
      workRelationId
    }
  }
`);
