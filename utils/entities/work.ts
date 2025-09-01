export const generateFakeWorkId = () => {
  return '00000000-0000-0000-0000-000000000000';
};

export const isFakeWorkId = (id: string) => {
  return id === generateFakeWorkId();
};
