'use client';

import { useState } from 'react';

import { AccessibilityStandard } from '@/gql/graphql';
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
import {
  AccessibilityExceptionType,
  AccessibilityStandardType,
  type BaseEditSectionProps,
  isAccessibilityStandardAvailable,
} from '@/src/shared';
import {
  accessibilityAdditionalStandards,
  accessibilityStandards,
  getAccessibilityStandardOptions,
} from '@/src/shared/constants/formFields';

export const useAddNewPublication = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activePublication, close } = usePublicationsStateMachine();

  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const { createPrice } = useCreatePrice({
    workId,
  });
  const { createLocation } = useCreateLocation({
    workId,
  });
  const { createPublication } = useCreatePublication({
    workId,
    onCompleted: () => {
      if (!publication) return close();

      publication.prices.forEach(({ id, currencyCode, unitPrice }) => {
        createPrice({
          id,
          publicationId: id,
          currencyCode,
          unitPrice,
        });
      });

      const sortedLocations = publication.locations.sort((a) => (a.canonical ? -1 : 1));

      if (sortedLocations.length > 0) sortedLocations[0].canonical = true;

      sortedLocations.forEach(({ id, locationPlatform, canonical, fullTextUrl, landingPage }) => {
        createLocation({
          id,
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

    const isAccessibilityAvailable = isAccessibilityStandardAvailable(type);
    const availableAccessibilityStandards = getAccessibilityStandardOptions(type);
    const defaultAccessibilityStandard = availableAccessibilityStandards.find(
      (standard) => standard.value === publication?.accessibilityStandard,
    );
    const defaultAccessibilityAdditionalStandard = availableAccessibilityStandards.find(
      (standard) => standard.value === publication?.accessibilityAdditionalStandard,
    );

    if (isAccessibilityAvailable) {
      setPublication({
        ...publication,
        type,
        accessibilityStandard: (defaultAccessibilityStandard?.value as AccessibilityStandard) ?? null,
        accessibilityAdditionalStandard:
          (defaultAccessibilityAdditionalStandard?.value as AccessibilityStandard) ?? null,
      });
      return;
    }

    setPublication({
      ...publication,
      type,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
      accessibilityReportUrl: '',
    });
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

  const updateAccessibilityStandards = (standards: AccessibilityStandardType[]) => {
    if (!publication || standards.length === 0) return;

    const standard = standards.find((standard) => accessibilityStandards.includes(standard));
    const additionalStandard = standards.find((standard) => accessibilityAdditionalStandards.includes(standard));

    setPublication({
      ...publication,
      accessibilityStandard: standard ?? null,
      accessibilityAdditionalStandard: additionalStandard && standard ? additionalStandard : null,
      accessibilityException: null,
    });
  };

  const updateAccessibilityException = (exception: AccessibilityExceptionType) => {
    if (!publication) return;

    setPublication({
      ...publication,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: exception,
      accessibilityReportUrl: '',
    });
  };

  const updateAccessibilityReport = (report: string) => {
    if (!publication) return;

    setPublication({ ...publication, accessibilityException: null, accessibilityReportUrl: report });
  };

  const deleteAccessibility = () => {
    if (!publication) return;

    setPublication({
      ...publication,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
    });
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
    updateAccessibilityStandards,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    selectAsCanonical,
  };
};
