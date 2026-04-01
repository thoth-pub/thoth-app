import { graphql } from '@/gql';

export const REFERENCE_FRAGMENT = graphql(`
  fragment ReferenceFragment on Reference {
    doi
    referenceId
    referenceOrdinal
    unstructuredCitation
    journalTitle
    articleTitle
    seriesTitle
    volumeTitle
    url
  }
`);
