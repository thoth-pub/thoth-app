import { graphql } from '@/gql';

export const CREATE_ENDORSEMENT = graphql(`
  mutation CreateEndorsement($markupFormat: MarkupFormat, $data: NewEndorsement!) {
    createEndorsement(markupFormat: $markupFormat, data: $data) {
      endorsementId
      workId
      authorName
      authorRole
      authorInstitutionId
      authorInstitution {
        institutionId
        institutionName
        ror
      }
      url
      text
      endorsementOrdinal
    }
  }
`);

export const UPDATE_ENDORSEMENT = graphql(`
  mutation UpdateEndorsement($markupFormat: MarkupFormat, $data: PatchEndorsement!) {
    updateEndorsement(markupFormat: $markupFormat, data: $data) {
      endorsementId
      workId
      authorName
      authorRole
      authorInstitutionId
      authorInstitution {
        institutionId
        institutionName
        ror
      }
      url
      text
      endorsementOrdinal
    }
  }
`);

export const DELETE_ENDORSEMENT = graphql(`
  mutation DeleteEndorsement($endorsementId: Uuid!) {
    deleteEndorsement(endorsementId: $endorsementId) {
      endorsementId
      workId
      authorName
      authorRole
      authorInstitutionId
      authorInstitution {
        institutionId
        institutionName
        ror
      }
      url
      text
      endorsementOrdinal
    }
  }
`);

export const MOVE_ENDORSEMENT = graphql(`
  mutation MoveEndorsement($endorsementId: Uuid!, $newOrdinal: Int!) {
    moveEndorsement(endorsementId: $endorsementId, newOrdinal: $newOrdinal) {
      endorsementId
      workId
      authorName
      authorRole
      authorInstitutionId
      authorInstitution {
        institutionId
        institutionName
        ror
      }
      url
      text
      endorsementOrdinal
    }
  }
`);
