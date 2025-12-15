import z from 'zod';

import type { Abstract as GQLAbstract, LocaleCode } from '@/gql/graphql';

import { AbstractTypes } from '../constants/abstracts';

export type AbstractDto = Omit<GQLAbstract, 'workId' | 'work'>;

export type AbstractType = z.infer<typeof AbstractTypes>;

export type AbstractId = string;

export type AbstractEntity = {
  id: AbstractId;
  type: AbstractType;
  canonical: boolean;
  content: string;
  localeCode: LocaleCode;
};
