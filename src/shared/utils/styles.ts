import { twMerge } from 'tailwind-merge';

export const mergeStyles = (defaultStyles: string, newStyles?: string) => {
  return twMerge(defaultStyles, newStyles);
};
