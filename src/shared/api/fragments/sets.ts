import { graphql } from '@/gql';

export const SET_FRAGMENT = graphql(`
  fragment SetFragment on Work {
    workId
    workType
    workStatus
    updatedAt
    imprintId
    edition
    titles(markupFormat: $markupFormat) {
      canonical
      fullTitle
      localeCode
      subtitle
      title
      titleId
    }
  }
`);
