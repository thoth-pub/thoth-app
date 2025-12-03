export const getAuthorizationHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
