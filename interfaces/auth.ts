export type AuthorizeUser = {
  accountId: string;
  createdAt: string;
  email: string;
  name: string;
  resourceAccess: {
    isSuperuser: boolean;
    isBot: boolean;
  };
  surname: string;
  token: string;
};
