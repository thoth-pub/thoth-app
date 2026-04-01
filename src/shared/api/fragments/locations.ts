import { graphql } from '@/gql';

export const LOCATION_FRAGMENT = graphql(`
  fragment LocationFragment on Location {
    canonical
    fullTextUrl
    landingPage
    locationPlatform
    locationId
  }
`);
