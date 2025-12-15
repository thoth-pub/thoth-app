import type { LocaleCode, Title as GQLTitle } from '@/gql/graphql';

export type TitleDto = Omit<GQLTitle, 'workId' | 'work'>;

export type TitleId = string;

export type TitleEntity = {
  id: TitleId;
  canonical: boolean;
  fullTitle: string;
  localeCode: LocaleCode;
  subtitle: string;
  title: string;
};
