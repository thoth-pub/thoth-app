import { graphql } from '@/gql';

export const BIOGRAPHY_FRAGMENT = graphql(`
  fragment BiographyFragment on Biography {
    biographyId
    canonical
    content
    localeCode
  }
`);
