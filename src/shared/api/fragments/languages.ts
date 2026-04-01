import { graphql } from '@/gql';

export const LANGUAGE_FRAGMENT = graphql(`
  fragment LanguageFragment on Language {
    languageId
    languageCode
    languageRelation
  }
`);
