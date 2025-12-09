import { graphql } from '@/gql';

export const CREATE_AFFILIATION = graphql(`
  mutation CreateAffiliation($data: NewAffiliation!) {
    createAffiliation(data: $data) {
      ...AffiliationFragment
    }
  }
`);

export const UPDATE_AFFILIATION = graphql(`
  mutation UpdateAffiliation($data: PatchAffiliation!) {
    updateAffiliation(data: $data) {
      ...AffiliationFragment
    }
  }
`);

export const DELETE_AFFILIATION = graphql(`
  mutation DeleteAffiliation($affiliationId: Uuid!) {
    deleteAffiliation(affiliationId: $affiliationId) {
      affiliationId
    }
  }
`);

export const MOVE_AFFILIATION = graphql(`
  mutation MoveAffiliation($affiliationId: Uuid!, $newOrdinal: Int!) {
    moveAffiliation(affiliationId: $affiliationId, newOrdinal: $newOrdinal) {
      ...AffiliationFragment
    }
  }
`);
