import { graphql } from '@/gql';

export const WORK_FEATURED_VIDEO_FRAGMENT = graphql(`
  fragment WorkFeaturedVideoFragment on WorkFeaturedVideo {
    workFeaturedVideoId
    workId
    title
    url
    width
    height
    file {
      cdnUrl
    }
  }
`);
