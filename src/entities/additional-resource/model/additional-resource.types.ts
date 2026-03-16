import type { WorkResourceFragmentFragment } from '@/gql/graphql';

export type AdditionalResourceDto = WorkResourceFragmentFragment;

export type AdditionalResourceId = string;

export type AdditionalResourceEntity = {
  id: AdditionalResourceId;
  workId: string;
  title: string;
  description: string;
  attribution: string;
  resourceType: string;
  doi: string;
  handle: string;
  url: string;
  orderNumber: number;
};
