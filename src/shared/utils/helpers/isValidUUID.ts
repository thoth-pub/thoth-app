import z from 'zod';

export const isValidUUID = (id: string) => {
  return z.uuid().safeParse(id).success;
};
