import { graphql } from '@/gql';

export const SET_FRAGMENT = graphql(`
  fragment SetFragment on Work {
    workId
    workType
    updatedAt
    titles(markupFormat: PLAIN_TEXT) {
      canonical
      fullTitle
      localeCode
      subtitle
      title
      titleId
    }
  }
`);
