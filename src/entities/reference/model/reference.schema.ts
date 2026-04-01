import { graphql } from '@/gql';

export const CREATE_REFERENCE = graphql(`
  mutation CreateReference($data: NewReference!) {
    createReference(data: $data) {
      ...ReferenceFragment
    }
  }
`);

export const UPDATE_REFERENCE = graphql(`
  mutation UpdateReference($data: PatchReference!) {
    updateReference(data: $data) {
      ...ReferenceFragment
    }
  }
`);

export const DELETE_REFERENCE = graphql(`
  mutation DeleteReference($referenceId: Uuid!) {
    deleteReference(referenceId: $referenceId) {
      ...ReferenceFragment
    }
  }
`);

export const MOVE_REFERENCE = graphql(`
  mutation MoveReference($referenceId: Uuid!, $newOrdinal: Int!) {
    moveReference(referenceId: $referenceId, newOrdinal: $newOrdinal) {
      ...ReferenceFragment
    }
  }
`);
