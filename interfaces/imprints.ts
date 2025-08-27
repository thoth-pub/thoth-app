import type { Imprint, Publisher } from '@/gql/graphql';

export type ImprintDto = Pick<Imprint, 'imprintId' | 'imprintName' | 'imprintUrl' | 'updatedAt'> & {
  publisher: Pick<Publisher, 'publisherName'>;
};

export type ImprintEntity = {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
  publisherName: string;
};
