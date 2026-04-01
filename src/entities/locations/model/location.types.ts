import z from 'zod';

import type { LocationFragmentFragment } from '@/gql/graphql';
import { LocationPlatforms } from '@/src/shared/constants';

import { locationPlatformValidationSchema, locationsValidationSchema } from './location.validation';

export type LocationsForm = z.infer<typeof locationsValidationSchema>;

export type LocationPlatform = z.infer<typeof LocationPlatforms>;

type LocationId = string;

export type LocationDto = LocationFragmentFragment;

export type LocationEntity = {
  canonical: boolean;
  fullTextUrl: string;
  landingPage: string;
  locationPlatform: LocationPlatform;
  id: LocationId;
};

export type LocationForm = z.infer<typeof locationPlatformValidationSchema>;
