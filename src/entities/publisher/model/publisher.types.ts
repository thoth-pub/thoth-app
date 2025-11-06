import type { Publisher } from '@/gql/graphql';

export type PublisherDto = Pick<
  Publisher,
  'publisherId' | 'publisherName' | 'publisherShortname' | 'publisherUrl' | 'updatedAt'
>;

export type PublisherId = string;

export type AuthorizedPublisher = PublisherEntity & { isAdmin: boolean };

export type PublisherEntity = {
  id: PublisherId;
  name: string;
  shortName: string;
  url: string;
  updatedAt: string;
};
