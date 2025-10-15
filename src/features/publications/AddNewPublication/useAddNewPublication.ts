'use client';

import { useState } from 'react';

import { useCreateLocation } from '@/src/entities/locations';
import type { LocationsForm } from '@/src/entities/locations/model/location.types';
import { useCreatePrice } from '@/src/entities/price';
import type { PricesForm } from '@/src/entities/price/model/price.types';
import { useCreatePublication, usePublicationsStateMachine } from '@/src/entities/publication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps } from '@/src/shared';

export const useAddNewPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activePublication, close } = usePublicationsStateMachine();

  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const { createPrice } = useCreatePrice({
    workId,
    queryToken,
  });
  const { createLocation } = useCreateLocation({
    workId,
    queryToken,
  });
  const { createPublication } = useCreatePublication({
    workId,
    queryToken,
    onCompleted: (data) => {
      if (!publication) return close();

      const { id } = data;

      publication.prices.forEach(({ currencyCode, unitPrice }) => {
        createPrice({
          publicationId: id,
          currencyCode,
          unitPrice,
        });
      });

      const sortedLocations = publication.locations.sort((a) => (a.canonical ? -1 : 1));

      if (sortedLocations.length > 0) sortedLocations[0].canonical = true;

      sortedLocations.forEach(({ locationPlatform, canonical, fullTextUrl, landingPage }) => {
        createLocation({
          publicationId: id,
          locationPlatform,
          canonical,
          fullTextUrl,
          landingPage,
        });
      });

      close();
    },
  });

  const create = () => {
    if (!publication) return;

    createPublication(publication);
  };

  const updateType = (type: PublicationType) => {
    if (!publication) return;

    setPublication({ ...publication, type });
  };

  const updateIsbn = (isbn: string) => {
    if (!publication) return;

    setPublication({ ...publication, isbn });
  };

  const updateDimensions = (dimensions: PublicationDimensionsForm) => {
    if (!publication) return;

    const width = dimensions.widthMm ? +dimensions.widthMm : 0;
    const widthIn = dimensions.widthIn ? +dimensions.widthIn : 0;
    const height = dimensions.heightMm ? +dimensions.heightMm : 0;
    const heightIn = dimensions.heightIn ? +dimensions.heightIn : 0;
    const depth = dimensions.depthMm ? +dimensions.depthMm : 0;
    const depthIn = dimensions.depthIn ? +dimensions.depthIn : 0;
    const weight = dimensions.weightG ? +dimensions.weightG : 0;
    const weightOz = dimensions.weightOz ? +dimensions.weightOz : 0;

    setPublication({
      ...publication,
      ...dimensions,
      width,
      widthIn,
      height,
      heightIn,
      depth,
      depthIn,
      weight,
      weightOz,
    });
  };

  const updatePrices = (data: PricesForm) => {
    if (!publication) return;

    const prices = data.prices.map(({ priceId, currency, priceValue }) => ({
      id: priceId,
      currencyCode: currency.value,
      unitPrice: priceValue,
    }));

    setPublication({ ...publication, prices });
  };

  const updateLocations = (data: LocationsForm) => {
    if (!publication) return;

    const locations = data.locations.map(({ platformId, platform, fullTextUrl, landingPage }) => {
      const canonical = publication.locations.find(({ id }) => id === platformId)?.canonical ?? false;

      return {
        id: platformId,
        locationPlatform: platform.value,
        canonical,
        fullTextUrl: fullTextUrl ?? '',
        landingPage: landingPage ?? '',
      };
    });

    setPublication({ ...publication, locations });
  };

  const selectAsCanonical = (platformId: string) => {
    if (!publication) return;

    const updatedLocations = publication.locations.map((location) => ({
      ...location,
      canonical: location.id === platformId,
    }));

    setPublication({ ...publication, locations: updatedLocations });
  };

  return {
    publication,
    close,
    create,
    updateType,
    updateIsbn,
    updateDimensions,
    updatePrices,
    updateLocations,
    selectAsCanonical,
  };
};
