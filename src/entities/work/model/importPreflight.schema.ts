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

/**
 * Works whose DOI may equal a relation endpoint's, in every publisher (thoth-app#224).
 *
 * Read-only discovery across the whole catalogue: a relation may name a Work of another publisher, and that must be told
 * apart from a Work that does not exist (5541586341 rule 25), so no publisher filter is given. The imprint is what places a
 * match inside or outside the active publisher; the languages are the evidence a translation direction may rest on. Like
 * the scoped lookups above, the filter is a substring search whose results are verified exactly on the client.
 */
export const GET_WORKS_BY_DOI_GLOBALLY = graphql(`
  query GetWorksByDoiGlobally($filter: String!, $limit: Int!, $offset: Int!) {
    works(filter: $filter, limit: $limit, offset: $offset, order: { field: WORK_ID, direction: ASC }) {
      workId
      doi
      imprintId
      languages {
        languageCode
      }
    }
  }
`);

/** Publications whose ISBN may equal a relation endpoint's, in every publisher, with the Work each belongs to. */
export const GET_PUBLICATIONS_BY_ISBN_GLOBALLY = graphql(`
  query GetPublicationsByIsbnGlobally($filter: String!, $limit: Int!, $offset: Int!) {
    publications(filter: $filter, limit: $limit, offset: $offset, order: { field: PUBLICATION_ID, direction: ASC }) {
      publicationId
      isbn
      work {
        workId
        doi
        imprintId
        languages {
          languageCode
        }
      }
    }
  }
`);

/**
 * Every relation one existing Work holds, a page at a time in the order of their own ids - a total order, so no relation
 * is skipped between pages. Chapter relations are read too: a Work pair holds one relation, whatever its type.
 */
export const GET_WORK_RELATIONS_FOR_PREFLIGHT = graphql(`
  query GetWorkRelationsForPreflight($workId: Uuid!, $limit: Int!, $offset: Int!) {
    work(workId: $workId) {
      workId
      relations(limit: $limit, offset: $offset, order: { field: WORK_RELATION_ID, direction: ASC }) {
        workRelationId
        relatedWorkId
        relationType
        relationOrdinal
      }
    }
  }
`);

/**
 * Every Reference one existing Work holds, a page at a time in ordinal order - unique within a Work, so a total order -
 * with only the fields a RelatedProduct/34 source can map to (#224 Amendment 1).
 */
export const GET_WORK_REFERENCES_FOR_PREFLIGHT = graphql(`
  query GetWorkReferencesForPreflight($workId: Uuid!, $limit: Int!, $offset: Int!) {
    work(workId: $workId) {
      workId
      references(limit: $limit, offset: $offset, order: { field: REFERENCE_ORDINAL, direction: ASC }) {
        referenceId
        referenceOrdinal
        doi
        unstructuredCitation
        isbn
        issn
      }
    }
  }
`);
