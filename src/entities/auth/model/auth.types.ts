import z from 'zod';

import { authValidationSchema } from './auth.validation';

export type LinkedPublisher = {
  publisherId: string;
  isAdmin: boolean;
};

export type AuthorizeUser = {
  accountId: string;
  createdAt: string;
  email: string;
  name: string;
  resourceAccess: {
    isSuperuser: boolean;
    isBot: boolean;
    linkedPublishers: LinkedPublisher[];
  };
  surname: string;
  token: string;
};

export type AuthFormData = z.infer<typeof authValidationSchema>;
