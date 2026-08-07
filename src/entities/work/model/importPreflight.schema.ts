import { graphql } from '@/gql';

/**
 * The two targeted lookups a duplicate preflight makes.
 *
 * Both are deliberately narrow. They ask about one identifier value at a time, scoped to one
 * publisher, and select only what the report displays — never the whole `WorkFragment`, and
 * never the publisher's catalogue to scan locally.
 *
 * Neither backend filter is exact, and the callers know it. `works(filter:)` is a case-insensitive
 * *substring* match spanning `doi`, `reference`, `landing_page`, `resources_description`,
 * canonical title and abstract content, so a DOI query can return works matching on any of those.
 * `publications(filter:)` is a substring match on the ISBN with hyphens ignored on both sides.
 * Each result is verified exactly on the client before it is allowed to become a finding.
 *
 * Both order by their own primary key, and say so rather than trusting a default. Offset
 * pagination is only meaningful over a total order: rows tied on the sort key may come back in a
 * different arrangement from one request to the next, and a row that moves across a page boundary
 * between two requests is a row nobody sees. `PublicationOrderBy::default()` sorts by publication
 * type, which is nowhere near unique and carries no id tiebreaker, so an ISBN already in Thoth
 * could go unreported. A preflight that quietly misses a real match is worse than no preflight.
 */

/**
 * Works whose DOI may equal a planned one.
 *
 * `publications { isbn }` is selected because a work matched by DOI is displayed with its ISBNs;
 * it is not a second search.
 */
export const GET_WORKS_BY_IDENTIFIER_FILTER = graphql(`
  query GetWorksByIdentifierFilter($publishers: [Uuid!]!, $filter: String!, $limit: Int!, $offset: Int!) {
    works(
      publishers: $publishers
      filter: $filter
      limit: $limit
      offset: $offset
      order: { field: WORK_ID, direction: ASC }
    ) {
      workId
      doi
      imprintId
      titles {
        titleId
        canonical
        fullTitle
        localeCode
        subtitle
        title
      }
      publications {
        isbn
      }
    }
  }
`);

/**
 * Publications whose ISBN may equal a planned one, with the work each belongs to.
 *
 * The ISBN lives on the publication, so this is the only route to an existing work by ISBN. The
 * work is read through the publication rather than looked up again.
 */
export const GET_PUBLICATIONS_BY_ISBN_FILTER = graphql(`
  query GetPublicationsByIsbnFilter($publishers: [Uuid!]!, $filter: String!, $limit: Int!, $offset: Int!) {
    publications(
      publishers: $publishers
      filter: $filter
      limit: $limit
      offset: $offset
      order: { field: PUBLICATION_ID, direction: ASC }
    ) {
      publicationId
      isbn
      work {
        workId
        doi
        imprintId
        titles {
          titleId
          canonical
          fullTitle
          localeCode
          subtitle
          title
        }
        publications {
          isbn
        }
      }
    }
  }
`);
