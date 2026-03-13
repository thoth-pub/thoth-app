import { AwardFragmentFragment } from '@/gql/graphql';

export type AwardDto = AwardFragmentFragment;

export type AwardId = string;

export type AwardEntity = {
  id: AwardId;
  workId: string;
  title: string;
  url: string;
  category: string;
  note: string;
  orderNumber: number;
};
