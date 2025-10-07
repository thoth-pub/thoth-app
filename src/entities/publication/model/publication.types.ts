import z from 'zod';

import type { Publication, PublicationType as GQLPublicationType, Publisher, Work } from '@/gql/graphql';

import type { PriceDto, PriceEntity } from '../../price/model/price.type';
import {
  dimensionsValidationSchema,
  isbnValidationSchema,
  publicationTypeValidationSchema,
} from './publication.validation';

export type PublicationDto = Pick<
  Publication,
  'publicationId' | 'isbn' | 'publicationType' | 'updatedAt' | 'width' | 'height' | 'depth' | 'weight'
> & {
  work: Pick<Work, 'doi' | 'title'> & {
    imprint: { publisher: Pick<Publisher, 'publisherName'> };
  };
  prices: PriceDto[];
};

export type PublicationId = string;

export type PublicationType = GQLPublicationType;

export type PublicationEntity = {
  id: PublicationId;
  isbn: string;
  title: string;
  type: PublicationType;
  updatedAt: string;
  doi: string;
  publisherName: string;
  width: number;
  height: number;
  depth: number;
  weight: number;
  prices: PriceEntity[];
};

export type PublicationTypeForm = z.infer<typeof publicationTypeValidationSchema>;

export type PublicationIsbnForm = z.infer<typeof isbnValidationSchema>;

export type PublicationDimensionsForm = z.infer<typeof dimensionsValidationSchema>;
