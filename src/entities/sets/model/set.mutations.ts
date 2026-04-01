import { graphql } from '@/gql';

export const CREATE_SET = graphql(`
  mutation CreateSet($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {
    createWork(data: $data) {
      ...SetFragment
    }
  }
`);

export const UPDATE_SET = graphql(`
  mutation UpdateSet($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {
    updateWork(data: $data) {
      ...SetFragment
    }
  }
`);

export const DELETE_SET = graphql(`
  mutation DeleteWork($workId: Uuid!) {
    deleteWork(workId: $workId) {
      workId
    }
  }
`);

export const MOVE_BOOK_IN_SET = graphql(`
  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {
    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {
      workRelationId
    }
  }
`);

export const ADD_BOOK_TO_SET = graphql(`
  mutation AddBookToSet($data: NewWorkRelation!) {
    createWorkRelation(data: $data) {
      workRelationId
    }
  }
`);

export const DELETE_BOOK_FROM_SET = graphql(`
  mutation DeleteBookFromSet($workRelationId: Uuid!) {
    deleteWorkRelation(workRelationId: $workRelationId) {
      workRelationId
    }
  }
`);
