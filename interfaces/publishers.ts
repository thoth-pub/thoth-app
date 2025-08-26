import type { Publisher } from '@/gql/graphql';

export type PublisherDto = Pick<
  Publisher,
  'publisherId' | 'publisherName' | 'publisherShortname' | 'publisherUrl' | 'updatedAt'
>;

export type PublisherEntity = {
  id: string;
  name: string;
  shortName: string;
  url: string;
  updatedAt: string;
};
