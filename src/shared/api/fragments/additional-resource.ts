import { graphql } from '@/gql';

export const WORK_RESOURCE_FRAGMENT = graphql(`
  fragment WorkResourceFragment on WorkResource {
    workResourceId
    workId
    title
    description
    attribution
    resourceType
    doi
    handle
    url
    resourceOrdinal
  }
`);
