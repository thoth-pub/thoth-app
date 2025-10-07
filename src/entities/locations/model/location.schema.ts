import { graphql } from '@/gql';

export const CREATE_LOCATION = graphql(`
  mutation CreateLocation($data: NewLocation!) {
    createLocation(data: $data) {
      ...LocationFragment
    }
  }
`);

export const UPDATE_LOCATION = graphql(`
  mutation UpdateLocation($data: PatchLocation!) {
    updateLocation(data: $data) {
      ...LocationFragment
    }
  }
`);

export const DELETE_LOCATION = graphql(`
  mutation DeleteLocation($locationId: Uuid!) {
    deleteLocation(locationId: $locationId) {
      locationId
    }
  }
`);
