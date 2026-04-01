import z from 'zod';

import type { Publication, PublicationType as GQLPublicationType, Publisher, Work } from '@/gql/graphql';
import type { AccessibilityExceptionType, AccessibilityStandardType, TitleEntity } from '@/src/shared/types';

import type { LocationDto, LocationEntity } from '../../locations/model/location.types';
import type { PriceDto, PriceEntity } from '../../price/model/price.types';
import {
  accessibilityExceptionValidationSchema,
  accessibilityReportUrlValidationSchema,
  accessibilityStandardValidationSchema,
  accessibilityValidationSchema,
  dimensionsValidationSchema,
  isbnValidationSchema,
  publicationFileValidationSchema,
  publicationTypeValidationSchema,
} from './publication.validation';

export type PublicationDto = Pick<
  Publication,
  | 'publicationId'
  | 'isbn'
  | 'publicationType'
  | 'updatedAt'
  | 'width'
  | 'height'
  | 'depth'
  | 'weight'
  | 'accessibilityAdditionalStandard'
  | 'accessibilityException'
  | 'accessibilityReportUrl'
  | 'accessibilityStandard'
  | 'file'
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
  accessibilityReportUrl: string;
  accessibilityAdditionalStandard: AccessibilityStandardType | null;
  accessibilityException: AccessibilityExceptionType | null;
  accessibilityStandard: AccessibilityStandardType | null;
  fileUrl: string | null;
};

export type PublicationTypeForm = z.infer<typeof publicationTypeValidationSchema>;

export type PublicationIsbnForm = z.infer<typeof isbnValidationSchema>;

export type PublicationDimensionsForm = z.infer<typeof dimensionsValidationSchema>;

export type PublicationAccessibilityStandardForm = z.infer<typeof accessibilityStandardValidationSchema>;

export type PublicationAccessibilityExceptionForm = z.infer<typeof accessibilityExceptionValidationSchema>;

export type PublicationAccessibilityReportUrlForm = z.infer<typeof accessibilityReportUrlValidationSchema>;

export type PublicationAccessibilityForm = z.infer<typeof accessibilityValidationSchema>;

export type PublicationFileForm = z.infer<typeof publicationFileValidationSchema>;
