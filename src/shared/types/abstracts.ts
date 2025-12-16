import z from 'zod';

import type { Abstract as GQLAbstract } from '@/gql/graphql';

import { AbstractTypes } from '../constants/abstracts';
import type { LocaleCodeType } from './languages';

export type AbstractDto = Omit<GQLAbstract, 'workId' | 'work'>;

export type AbstractType = z.infer<typeof AbstractTypes>;

export type AbstractId = string;

export type AbstractEntity = {
  id: AbstractId;
  type: AbstractType;
  canonical: boolean;
  content: string;
  localeCode: LocaleCodeType;
};
