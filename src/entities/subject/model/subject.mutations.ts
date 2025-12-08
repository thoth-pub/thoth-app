import { graphql } from '@/gql';

export const CREATE_SUBJECT = graphql(`
  mutation CreateSubject($data: NewSubject!) {
    createSubject(data: $data) {
      ...SubjectFragment
    }
  }
`);

export const UPDATE_SUBJECT = graphql(`
  mutation UpdateSubject($data: PatchSubject!) {
    updateSubject(data: $data) {
      ...SubjectFragment
    }
  }
`);

export const DELETE_SUBJECT = graphql(`
  mutation DeleteSubject($subjectId: Uuid!) {
    deleteSubject(subjectId: $subjectId) {
      ...SubjectFragment
    }
  }
`);

export const MOVE_SUBJECT = graphql(`
  mutation MoveSubject($subjectId: Uuid!, $newOrdinal: Int!) {
    moveSubject(subjectId: $subjectId, newOrdinal: $newOrdinal) {
      subjectId
    }
  }
`);
