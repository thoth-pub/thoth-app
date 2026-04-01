import { graphql } from '@/gql';

export const ABSTRACT_FRAGMENT = graphql(`
  fragment AbstractFragment on Abstract {
    abstractId
    abstractType
    canonical
    content
    localeCode
  }
`);
