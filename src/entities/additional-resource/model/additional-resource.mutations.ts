import { graphql } from '@/gql';

export const CREATE_ADDITIONAL_RESOURCE = graphql(`
  mutation CreateAdditionalResource($data: NewAdditionalResource!, $markupFormat: MarkupFormat) {
    createAdditionalResource(data: $data, markupFormat: $markupFormat) {
      ...WorkResourceFragment
    }
  }
`);

export const UPDATE_ADDITIONAL_RESOURCE = graphql(`
  mutation UpdateAdditionalResource($data: PatchAdditionalResource!, $markupFormat: MarkupFormat) {
    updateAdditionalResource(data: $data, markupFormat: $markupFormat) {
      ...WorkResourceFragment
    }
  }
`);

export const DELETE_ADDITIONAL_RESOURCE = graphql(`
  mutation DeleteAdditionalResource($additionalResourceId: Uuid!) {
    deleteAdditionalResource(additionalResourceId: $additionalResourceId) {
      ...WorkResourceFragment
    }
  }
`);

export const MOVE_ADDITIONAL_RESOURCE = graphql(`
  mutation MoveAdditionalResource($additionalResourceId: Uuid!, $newOrdinal: Int!) {
    moveAdditionalResource(additionalResourceId: $additionalResourceId, newOrdinal: $newOrdinal) {
      ...WorkResourceFragment
    }
  }
`);
