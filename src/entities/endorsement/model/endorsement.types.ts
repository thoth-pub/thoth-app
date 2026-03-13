import type { EndorsementFragmentFragment } from '@/gql/graphql';

export type EndorsementDto = EndorsementFragmentFragment;

export type EndorsementId = string;

export type EndorsementEntity = {
  id: EndorsementId;
  workId: string;
  authorName: string;
  authorRole: string;
  url: string;
  text: string;
  orderNumber: number;
};
