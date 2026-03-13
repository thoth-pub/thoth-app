import { graphql } from '@/gql';

export const CREATE_AWARD = graphql(`
  mutation CreateAward($data: NewAward!, $markupFormat: MarkupFormat) {
    createAward(data: $data, markupFormat: $markupFormat) {
      ...AwardFragment
    }
  }
`);

export const UPDATE_AWARD = graphql(`
  mutation UpdateAward($data: PatchAward!, $markupFormat: MarkupFormat) {
    updateAward(data: $data, markupFormat: $markupFormat) {
      ...AwardFragment
    }
  }
`);

export const DELETE_AWARD = graphql(`
  mutation DeleteAward($awardId: Uuid!) {
    deleteAward(awardId: $awardId) {
      ...AwardFragment
    }
  }
`);

export const MOVE_AWARD = graphql(`
  mutation MoveAward($awardId: Uuid!, $newOrdinal: Int!) {
    moveAward(awardId: $awardId, newOrdinal: $newOrdinal) {
      ...AwardFragment
    }
  }
`);
