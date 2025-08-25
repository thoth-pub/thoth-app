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
