import { graphql } from '@/gql';

export const GET_SETS = graphql(`
  query GetSets(
    $publishers: [Uuid!]!
    $filter: String
    $offset: Int
    $limit: Int
    $direction: Direction = ASC
    $field: WorkField = UPDATED_AT_WITH_RELATIONS
    $markupFormat: MarkupFormat = JATS_XML
  ) {
    works(
      publishers: $publishers
      filter: $filter
      offset: $offset
      limit: $limit
      order: { direction: $direction, field: $field }
      workTypes: [BOOK_SET]
    ) {
      ...SetFragment
    }
  }
`);

export const GET_SET = graphql(`
  query GetSet($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {
    work(workId: $workId) {
      ...SetFragment
    }
  }
`);

export const GET_SETS_COUNT = graphql(`
  query GetSetsCount($publishers: [Uuid!]!) {
    workCount(publishers: $publishers, workTypes: [BOOK_SET])
  }
`);

export const GET_BOOK_SET_WORKS = graphql(`
  query GetBookSetWorks($setId: Uuid!, $markupFormat: MarkupFormat = PLAIN_TEXT) {
    work(workId: $setId) {
      relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {
        relationOrdinal
        workRelationId
        relatedWorkId
        relatedWork {
          titles(markupFormat: $markupFormat) {
            canonical
            fullTitle
            localeCode
            subtitle
            title
            titleId
          }
        }
      }
    }
  }
`);
