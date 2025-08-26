import type { Contribution, Publisher, Work, WorkType } from '@/gql/graphql';

export type WorkDto = Pick<Work, 'workId' | 'title' | 'workType' | 'updatedAt' | 'doi'> & {
  imprint: { publisher: Pick<Publisher, 'publisherName'> };
  contributions: Pick<Contribution, 'fullName'>[];
};

export type WorkEntity = {
  id: string;
  title: string;
  type: WorkType;
  updatedAt: string;
  contributorsNames: string[];
  doi: string;
  publisherName: string;
};
