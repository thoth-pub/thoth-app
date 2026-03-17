import { graphql } from '@/gql';

export const CREATE_FEATURED_VIDEO = graphql(`
  mutation CreateWorkFeaturedVideo($data: NewWorkFeaturedVideo!) {
    createWorkFeaturedVideo(data: $data) {
      ...WorkFeaturedVideoFragment
    }
  }
`);

export const UPDATE_FEATURED_VIDEO = graphql(`
  mutation UpdateWorkFeaturedVideo($data: PatchWorkFeaturedVideo!) {
    updateWorkFeaturedVideo(data: $data) {
      ...WorkFeaturedVideoFragment
    }
  }
`);

export const DELETE_FEATURED_VIDEO = graphql(`
  mutation DeleteWorkFeaturedVideo($workFeaturedVideoId: Uuid!) {
    deleteWorkFeaturedVideo(workFeaturedVideoId: $workFeaturedVideoId) {
      ...WorkFeaturedVideoFragment
    }
  }
`);
