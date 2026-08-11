import z from 'zod';

import type { Abstract as GQLAbstract } from '@/gql/graphql';

import { AbstractTypes } from '../constants/abstracts';
import type { LocaleCodeType } from './languages';
import type { ImportedMarkupFormat } from './markdown';

export type AbstractDto = Omit<GQLAbstract, 'workId' | 'work'>;

export type AbstractType = z.infer<typeof AbstractTypes>;

export type AbstractId = string;

export type AbstractEntity = {
  id: AbstractId;
  type: AbstractType;
  canonical: boolean;
  content: string;
  localeCode: LocaleCodeType;
  /**
   * The markup format the content arrived in, when this abstract came from a bulk import whose
   * source declared one. Creation intent only: `AbstractDtoMapper` never maps it, so it cannot
   * reach a GraphQL data DTO, and entities read back from the API never carry it. Absent for
   * everything created in the editor, which keeps the existing content-sniffing behaviour.
   */
  sourceMarkupFormat?: ImportedMarkupFormat;
};
