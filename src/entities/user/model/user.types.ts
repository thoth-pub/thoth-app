import { GetUserQuery } from '@/gql/graphql';

import { ImprintEntity } from '../../imprint';

export type UserDto = GetUserQuery['me'];

export type UserEntity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperuser: boolean;
  linkedPublishers: {
    publisherId: string;
    publisherName: string;
    publisherAdmin: boolean;
    workLifecycle: boolean;
    cdnWrite: boolean;
    imprints: ImprintEntity[];
  }[];
};
