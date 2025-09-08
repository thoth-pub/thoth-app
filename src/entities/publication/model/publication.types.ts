import type { Publication, PublicationType, Publisher, Work } from '@/gql/graphql';

export type PublicationDto = Pick<Publication, 'publicationId' | 'isbn' | 'publicationType' | 'updatedAt'> & {
  work: Pick<Work, 'doi' | 'title'> & {
    imprint: { publisher: Pick<Publisher, 'publisherName'> };
  };
};

export type PublicationEntity = {
  id: string;
  isbn: string;
  title: string;
  type: PublicationType;
  updatedAt: string;
  doi: string;
  publisherName: string;
};
