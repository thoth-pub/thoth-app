import { graphql } from '@/gql';

export const TITLE_FRAGMENT = graphql(`
  fragment TitleFragment on Title {
    canonical
    fullTitle
    localeCode
    subtitle
    title
    titleId
  }
`);
