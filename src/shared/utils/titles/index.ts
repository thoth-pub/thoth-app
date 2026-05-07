import { appConfig } from '@/src/shared/config';

const { terminalPunctuation } = appConfig.titles;

export const compileFullTitle = (title: string, subtitle?: string) => {
  if (!subtitle) return title;

  return terminalPunctuation.some((char) => title.endsWith(char)) ? `${title} ${subtitle}` : `${title}: ${subtitle}`;
};
