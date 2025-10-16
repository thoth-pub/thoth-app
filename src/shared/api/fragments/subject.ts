import { graphql } from '@/gql';

export const SUBJECT_FRAGMENT = graphql(`
  fragment SubjectFragment on Subject {
    subjectId
    subjectCode
    subjectType
    subjectOrdinal
  }
`);
