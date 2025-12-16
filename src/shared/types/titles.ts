import type { Title as GQLTitle } from '@/gql/graphql';

import type { LocaleCodeType } from './languages';

export type TitleDto = Omit<GQLTitle, 'workId' | 'work'>;

export type TitleId = string;

export type TitleEntity = {
  id: TitleId;
  canonical: boolean;
  fullTitle: string;
  localeCode: LocaleCodeType;
  subtitle: string;
  title: string;
};
