'use client';

import { useState } from 'react';

import { useCreateLocation } from '@/src/entities/locations';
import type { LocationsForm } from '@/src/entities/locations/model/location.type';
import { useCreatePrice } from '@/src/entities/price';
import type { PricesForm } from '@/src/entities/price/model/price.type';
import { useCreatePublication, usePublicationsStateMachine } from '@/src/entities/publication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps, convertInToMm, convertOzToG, LengthUnit, WeightUnit } from '@/src/shared';

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

      publication.locations.forEach(({ locationPlatform, canonical, fullTextUrl, landingPage }) => {
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

    let width = dimensions.width ? +dimensions.width : 0;
    let height = dimensions.height ? +dimensions.height : 0;
    let depth = dimensions.depth ? +dimensions.depth : 0;

    if (dimensions.lengthUnit === LengthUnit.enum.In) {
      width = convertInToMm(width);
      height = convertInToMm(height);
      depth = convertInToMm(depth);
    }

    let weight = dimensions.weight ? +dimensions.weight : 0;

    if (dimensions.weightUnit === WeightUnit.enum.Oz) {
      weight = convertOzToG(weight);
    }

    setPublication({ ...publication, ...dimensions, width, height, depth, weight });
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

    const locations = data.locations.map(({ platformId, platform, canonical, fullUrl, landingPage }) => ({
      id: platformId,
      locationPlatform: platform.value,
      canonical,
      fullTextUrl: fullUrl ?? '',
      landingPage: landingPage ?? '',
    }));

    setPublication({ ...publication, locations });
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
  };
};
