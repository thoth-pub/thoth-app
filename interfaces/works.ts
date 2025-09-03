import type { WorkFragmentFragment, WorkType } from '@/gql/graphql';

export type WorkDto = WorkFragmentFragment;

export type WorkEntity = {
  id: string;
  title: string;
  type: WorkType;
  updatedAt: string;
  contributorsNames: string[];
  doi: string;
  publisherName: string;
};
