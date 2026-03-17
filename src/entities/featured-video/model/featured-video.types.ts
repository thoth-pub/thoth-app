import type { WorkFeaturedVideoFragmentFragment } from '@/gql/graphql';

export type FeaturedVideoDto = WorkFeaturedVideoFragmentFragment;

export type FeaturedVideoId = string;

export type FeaturedVideoEntity = {
  id: FeaturedVideoId;
  workId: string;
  title: string;
  url: string;
  width: number;
  height: number;
  fileUrl: string;
};
