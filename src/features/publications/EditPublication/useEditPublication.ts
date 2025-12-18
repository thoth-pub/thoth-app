'use client';

import { useState } from 'react';

import { useCreateLocation, useDeleteLocation, useUpdateLocation } from '@/src/entities/locations';
import type { LocationEntity, LocationsForm } from '@/src/entities/locations/model/location.types';
import { useCreatePrice, useDeletePrice, useUpdatePrice } from '@/src/entities/price';
import type { CurrencyCode, PricesForm } from '@/src/entities/price/model/price.types';
import { usePublicationsStateMachine, useUpdatePublication } from '@/src/entities/publication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import {
  AccessibilityExceptionType,
  AccessibilityStandardType,
  type BaseEditSectionProps,
  isAccessibilityStandardAvailable,
  isAdditionalAccessibilityStandardAvailable,
  isDefaultId,
} from '@/src/shared';

export const useEditPublication = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activePublication, close } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const { updatePublication } = useUpdatePublication({ workId });
  const { createPrice } = useCreatePrice({ workId });
  const { updatePrice } = useUpdatePrice({ workId });
  const { deletePrice } = useDeletePrice({ workId });
  const { createLocation } = useCreateLocation({ workId });
  const { updateLocation } = useUpdateLocation({ workId });
  const { deleteLocation: deleteLocationMutation } = useDeleteLocation({ workId });

  const updateSizes = (sizes: PublicationDimensionsForm) => {
    if (!publication) return;

    const updatedPublication = { ...publication, ...sizes };

    updatePublication(updatedPublication);

    setPublication({ ...publication, ...sizes });
  };

  const updateIsbn = (isbn: string) => {
    if (!publication) return;

    const updatedPublication = { ...publication, isbn };

    updatePublication(updatedPublication);

    setPublication({ ...publication, isbn });
  };

  const updateType = (type: PublicationType) => {
    if (!publication) return;

    const isAdditionalStandardAvailable = isAdditionalAccessibilityStandardAvailable(type);
    const isAccessibilityAvailable = isAccessibilityStandardAvailable(type);

    if (isAdditionalStandardAvailable) {
      const updatedPublication = { ...publication, type, accessibilityStandard: null };

      updatePublication(updatedPublication);
      setPublication(updatedPublication);

      return;
    }

    if (isAccessibilityAvailable) {
      const updatedPublication = { ...publication, type };

      updatePublication(updatedPublication);
      setPublication(updatedPublication);

      return;
    }

    const updatedPublication = {
      ...publication,
      type,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
      accessibilityReportUrl: '',
    };

    updatePublication(updatedPublication);
    setPublication(updatedPublication);
  };

  const updateAccessibilityStandard = (standard: AccessibilityStandardType) => {
    if (!publication) return;

    const updatedPublication = {
      ...publication,
      accessibilityStandard: standard,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
    };

    updatePublication(updatedPublication);
  };

  const updateAccessibilityAdditionalStandard = (standard: AccessibilityStandardType) => {
    if (!publication) return;

    const updatedPublication = {
      ...publication,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: standard,
      accessibilityException: null,
    };

    updatePublication(updatedPublication);
  };

  const updateAccessibilityException = (exception: AccessibilityExceptionType) => {
    if (!publication) return;

    const updatedPublication = {
      ...publication,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: exception,
      accessibilityReportUrl: '',
    };

    updatePublication(updatedPublication);
  };

  const updateAccessibilityReport = (report: string) => {
    if (!publication) return;

    const updatedPublication = { ...publication, accessibilityException: null, accessibilityReportUrl: report };

    updatePublication(updatedPublication);
  };

  const deleteAccessibility = () => {
    if (!publication) return;

    const updatedPublication = {
      ...publication,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
    };

    updatePublication(updatedPublication);
  };

  const updatePrices = (data: PricesForm) => {
    if (!publication) return;

    const existingCodes = publication.prices.map(({ currencyCode }) => currencyCode);

    const prices = data.prices.map(({ priceId, currency, priceValue }) => ({
      id: priceId,
      currencyCode: currency.value,
      unitPrice: priceValue,
    }));

    const updatedCodes: CurrencyCode[] = [];

    prices.forEach(({ id, currencyCode, unitPrice }) => {
      updatedCodes.push(currencyCode);

      if (existingCodes.includes(currencyCode)) {
        updatePrice({
          id,
          currencyCode,
          unitPrice,
          publicationId: publication.id,
        });
        return;
      }

      createPrice({
        id,
        publicationId: publication.id,
        currencyCode,
        unitPrice,
      });
    });

    publication.prices.forEach(({ currencyCode, id }) => {
      if (!updatedCodes.includes(currencyCode)) {
        deletePrice(id);
      }
    });

    setPublication({ ...publication, prices });
  };

  const updateLocations = async (data: LocationsForm) => {
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

    const newLocations = locations.filter(({ id }) => isDefaultId(id));
    const existingLocations = locations.filter(({ id }) => !isDefaultId(id));
    const notUpdatedLocations: LocationEntity[] = [];
    const updatedLocations = publication.locations.filter((location) => {
      const existingLocation = existingLocations.find(({ id }) => id === location.id);

      if (!existingLocation) return false;

      const keys = Object.keys(existingLocation).filter((key) => key !== 'canonical') as (keyof LocationEntity)[];
      const isUpdated = keys.some((key) => existingLocation[key] !== location[key]);

      if (!isUpdated) {
        notUpdatedLocations.push(location);
      }

      return isUpdated;
    });

    newLocations.forEach(({ id, locationPlatform, canonical, fullTextUrl, landingPage }) => {
      createLocation({
        id,
        publicationId: publication.id,
        locationPlatform,
        canonical,
        fullTextUrl,
        landingPage,
      });
    });

    updatedLocations.forEach(({ id, locationPlatform, canonical, fullTextUrl, landingPage }) => {
      updateLocation({
        id,
        locationPlatform,
        canonical,
        fullTextUrl,
        landingPage,
        publicationId: publication.id,
      });
    });

    setPublication({ ...publication, locations: [...newLocations, ...updatedLocations, ...notUpdatedLocations] });
  };

  const deleteLocation = (platformId: string) => {
    if (!publication) return;

    const item = publication.locations.find(({ id }) => id === platformId);

    if (!item) return;

    const updatedLocations = publication.locations.filter(({ id }) => id !== platformId);

    deleteLocationMutation(platformId);
    setPublication({ ...publication, locations: updatedLocations });
  };

  const selectAsCanonical = (platformId: string) => {
    if (!publication) return;

    const location = publication.locations.find(({ id }) => id === platformId);

    if (!location) return;

    const updatedLocations = publication.locations.map((location) => ({
      ...location,
      canonical: location.id === platformId,
    }));

    updateLocation({
      ...location,
      canonical: true,
      publicationId: publication.id,
    });

    setPublication({ ...publication, locations: updatedLocations });
  };

  return {
    activePublication: publication,
    close,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibilityStandard,
    updateAccessibilityAdditionalStandard,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    selectAsCanonical,
  };
};
