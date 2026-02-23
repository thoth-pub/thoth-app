'use client';

import { useEffect, useState } from 'react';

import { AccessibilityStandard } from '@/gql/graphql';
import { useCreateLocation, useDeleteLocation, useUpdateLocation } from '@/src/entities/locations';
import type { LocationEntity } from '@/src/entities/locations/model/location.types';
import { useCreatePrice, useDeletePrice, useUpdatePrice } from '@/src/entities/price';
import type { CurrencyCode, PricesForm } from '@/src/entities/price/model/price.types';
import {
  usePublicationsStateMachine,
  useUpdatePublication,
  useUploadPublicationFile,
} from '@/src/entities/publication';
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
  isDefaultId,
} from '@/src/shared';
import {
  accessibilityAdditionalStandards,
  accessibilityStandards,
  getAccessibilityStandardOptions,
} from '@/src/shared/constants/formFields';
import { selectCanonicalLocation } from '@/src/shared/utils/locations';

export const useEditPublication = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activePublication, close } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const { updatePublication, loading: isUpdatePublicationLoading } = useUpdatePublication({ workId });
  const { createPrice, loading: isCreatePriceLoading } = useCreatePrice({ workId });
  const { updatePrice, loading: isUpdatePriceLoading } = useUpdatePrice({ workId });
  const { deletePrice } = useDeletePrice({ workId });
  const { createLocation, loading: isCreateLocationLoading } = useCreateLocation({ workId });
  const { updateLocation, loading: isUpdateLocationLoading } = useUpdateLocation({ workId });
  const { deleteLocation: deleteLocationMutation } = useDeleteLocation({ workId });
  const { uploadPublicationFile, loading: isUploadPublicationFileLoading } = useUploadPublicationFile(workId);

  useEffect(() => {
    if (!activePublication || publication) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublication(activePublication);
  }, [activePublication, publication]);

  const loading =
    isUpdatePublicationLoading ||
    isCreatePriceLoading ||
    isUpdatePriceLoading ||
    isCreateLocationLoading ||
    isUpdateLocationLoading ||
    isUploadPublicationFileLoading;

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

    const isAccessibilityAvailable = isAccessibilityStandardAvailable(type);
    const availableAccessibilityStandards = getAccessibilityStandardOptions(type);
    const defaultAccessibilityStandard = availableAccessibilityStandards.find(
      (standard) => standard.value === publication?.accessibilityStandard,
    );
    const defaultAccessibilityAdditionalStandard = availableAccessibilityStandards.find(
      (standard) => standard.value === publication?.accessibilityAdditionalStandard,
    );

    if (isAccessibilityAvailable) {
      const updatedPublication = {
        ...publication,
        type,
        accessibilityStandard: (defaultAccessibilityStandard?.value as AccessibilityStandard) ?? null,
        accessibilityAdditionalStandard:
          defaultAccessibilityStandard?.value && defaultAccessibilityAdditionalStandard?.value
            ? (defaultAccessibilityAdditionalStandard?.value as AccessibilityStandard)
            : null,
      };

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

  const updateAccessibilityStandards = (standards: AccessibilityStandardType[]) => {
    if (!publication || standards.length === 0) return;

    const standard = standards.find((standard) => accessibilityStandards.includes(standard));
    const additionalStandard = standards.find((standard) => accessibilityAdditionalStandards.includes(standard));

    const updatedPublication = {
      ...publication,
      accessibilityStandard: standard ?? null,
      accessibilityAdditionalStandard: additionalStandard && standard ? additionalStandard : null,
      accessibilityException: null,
    };

    updatePublication(updatedPublication);
    setPublication(updatedPublication);
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
    setPublication(updatedPublication);
  };

  const updateAccessibilityReport = (report: string) => {
    if (!publication) return;

    const updatedPublication = { ...publication, accessibilityException: null, accessibilityReportUrl: report };

    updatePublication(updatedPublication);
    setPublication(updatedPublication);
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

  const updateLocations = async (data: LocationEntity[]) => {
    if (!publication) return;

    const locations = selectCanonicalLocation(data);

    const newLocations = locations.filter(({ id }) => isDefaultId(id));
    const existingLocations = locations.filter(({ id }) => !isDefaultId(id));
    const notUpdatedLocations: LocationEntity[] = [];

    const updatedLocations = locations.filter((location) => {
      const existingLocation = existingLocations.find(({ id }) => id === location.id);

      if (!existingLocation) return false;

      const keys = Object.keys(existingLocation).filter((key) => key !== 'canonical') as (keyof LocationEntity)[];
      const isUpdated = keys.some((key) => existingLocation[key] !== location[key]);

      if (!isUpdated) {
        notUpdatedLocations.push(location);
      }

      return isUpdated;
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

    setPublication({ ...publication, locations: [...newLocations, ...updatedLocations, ...notUpdatedLocations] });
  };

  const deleteLocation = (platformId: string) => {
    if (!publication) return;

    const item = publication.locations.find(({ id }) => id === platformId);

    if (!item || isDefaultId(item.id)) return;

    const updatedLocations = publication.locations.filter(({ id }) => id !== platformId);
    const updatedLocationsWithCanonical = selectCanonicalLocation(updatedLocations);

    updateLocations(updatedLocationsWithCanonical);

    deleteLocationMutation(platformId);
    setPublication({ ...publication, locations: updatedLocationsWithCanonical });
  };

  const updateFile = async (file: File) => {
    if (!publication) return;

    const url = await uploadPublicationFile(publication.id, file);

    setPublication({ ...publication, fileUrl: url });
  };

  return {
    activePublication: publication,
    loading,
    close,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibilityStandards,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    updateFile,
  };
};
