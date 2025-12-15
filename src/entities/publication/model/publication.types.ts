import z from 'zod';

import type { Publication, PublicationType as GQLPublicationType, Publisher, Work } from '@/gql/graphql';
import { TitleEntity } from '@/src/shared';

import type { LocationDto, LocationEntity } from '../../locations/model/location.types';
import type { PriceDto, PriceEntity } from '../../price/model/price.types';
import {
  dimensionsValidationSchema,
  isbnValidationSchema,
  publicationTypeValidationSchema,
} from './publication.validation';

export type PublicationDto = Pick<
  Publication,
  'publicationId' | 'isbn' | 'publicationType' | 'updatedAt' | 'width' | 'height' | 'depth' | 'weight'
> & {
  work: Pick<Work, 'doi' | 'titles'> & {
    imprint: { publisher: Pick<Publisher, 'publisherName'> };
  };
  prices: PriceDto[];
  locations: LocationDto[];
};

export type PublicationId = string;

export type PublicationType = GQLPublicationType;

export type PublicationEntity = {
  id: PublicationId;
  isbn: string;
  titles: TitleEntity[];
  type: PublicationType;
  updatedAt: string;
  doi: string;
  publisherName: string;
  width: number;
  widthIn: number;
  height: number;
  heightIn: number;
  depth: number;
  depthIn: number;
  weight: number;
  weightOz: number;
  prices: PriceEntity[];
  locations: LocationEntity[];
};

export type PublicationTypeForm = z.infer<typeof publicationTypeValidationSchema>;

export type PublicationIsbnForm = z.infer<typeof isbnValidationSchema>;

export type PublicationDimensionsForm = z.infer<typeof dimensionsValidationSchema>;
