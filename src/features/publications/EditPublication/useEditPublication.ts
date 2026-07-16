'use client';

import { useEffect, useState } from 'react';

import { AccessibilityStandard } from '@/gql/graphql';
import { useCreateLocation, useDeleteLocation, useUpdateLocation } from '@/src/entities/locations';
import type { LocationEntity } from '@/src/entities/locations/model/location.types';
import { useCreatePrice, useDeletePrice, useUpdatePrice } from '@/src/entities/price';
import type { PricesForm } from '@/src/entities/price/model/price.types';
import {
  usePublicationsStateMachine,
  useUpdatePublication,
  useUploadPublicationFile,
} from '@/src/entities/publication';
import type {
  PublicationAccessibilityForm,
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import { useWork } from '@/src/entities/work';
import {
  accessibilityAdditionalStandards,
  accessibilityStandards,
  getAccessibilityStandardOptions,
} from '@/src/shared/constants';
import { useDefaultCurrencyOption } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { isAccessibilityStandardAvailable, isDefaultId } from '@/src/shared/utils';
import { selectCanonicalLocation } from '@/src/shared/utils/locations';

export const useEditPublication = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activeEntity: activePublication, finishEditing } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const [priceFormVersion, setPriceFormVersion] = useState(0);
  const { work } = useWork(workId);
  const defaultCurrencyOption = useDefaultCurrencyOption(work.imprintId);
  const { updatePublication, loading: isUpdatePublicationLoading } = useUpdatePublication({ workId });
  const { createPrice, loading: isCreatePriceLoading } = useCreatePrice({ workId });
  const { updatePrice, loading: isUpdatePriceLoading } = useUpdatePrice({ workId });
  const { deletePrice } = useDeletePrice({ workId });
  const { createLocation, loading: isCreateLocationLoading } = useCreateLocation({ workId });
  const { updateLocation, loading: isUpdateLocationLoading } = useUpdateLocation({ workId });
  const { deleteLocation: deleteLocationMutation, loading: isDeleteLocationLoading } = useDeleteLocation({ workId });
  const { uploadPublicationFile, loading: isUploadPublicationFileLoading, progress: uploadProgress } =
    useUploadPublicationFile(workId);

  useEffect(() => {
    if (!activePublication || publication) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublication(activePublication);
  }, [activePublication, publication]);

  useEffect(() => {
    if (!publication?.id) return;

    const freshPublication = work.publications.find(({ id }) => id === publication.id);

    if (!freshPublication) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublication(freshPublication);
  }, [work, publication?.id]);

  const loading =
    isUpdatePublicationLoading ||
    isCreatePriceLoading ||
    isUpdatePriceLoading ||
    isCreateLocationLoading ||
    isUpdateLocationLoading ||
    isUploadPublicationFileLoading;

  const updateSizes = (sizes: PublicationDimensionsForm) => {
    if (!publication) return;

    const mappedSizes = {
      width: sizes.widthMm ?? 0,
      widthIn: sizes.widthIn ?? 0,
      height: sizes.heightMm ?? 0,
      heightIn: sizes.heightIn ?? 0,
      depth: sizes.depthMm ?? 0,
      depthIn: sizes.depthIn ?? 0,
      weight: sizes.weightG ?? 0,
      weightOz: sizes.weightOz ?? 0,
    };

    const updatedPublication = { ...publication, ...mappedSizes };

    updatePublication(updatedPublication);

    setPublication(updatedPublication);
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

  const updateAccessibility = (data: PublicationAccessibilityForm) => {
    if (!publication) return;

    const standards = data.accessibilityStandard ?? [];
    const standard = standards.find((s) => accessibilityStandards.includes(s));
    const additionalStandard = standards.find((s) => accessibilityAdditionalStandards.includes(s));

    const updatedPublication = {
      ...publication,
      accessibilityStandard: standard ?? null,
      accessibilityAdditionalStandard: additionalStandard && standard ? additionalStandard : null,
      accessibilityException:
        data.accessibilityException && data.accessibilityException.length > 0 ? data.accessibilityException : null,
      accessibilityReportUrl: data.accessibilityReportUrl ?? '',
    };

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
      accessibilityReportUrl: '',
    };

    updatePublication(updatedPublication);
    setPublication(updatedPublication);
  };

  const updatePrices = async (data: PricesForm) => {
    if (!publication) return;

    const prices = data.prices.map(({ priceId, currency, priceValue }) => ({
      id: priceId,
      currencyCode: currency.value,
      unitPrice: priceValue,
    }));

    const newPrices = prices.filter(({ id }) => isDefaultId(id));
    const existingPrices = prices.filter(({ id }) => !isDefaultId(id));

    const updatedPrices = existingPrices.filter((price) => {
      const previousPrice = publication.prices.find(({ id }) => id === price.id);

      if (!previousPrice) return true;

      return previousPrice.currencyCode !== price.currencyCode || previousPrice.unitPrice !== price.unitPrice;
    });

    const submittedIds = prices.map(({ id }) => id);
    const deletedPrices = publication.prices.filter(({ id }) => !submittedIds.includes(id));

    const priceMutations = [
      ...updatedPrices.map((price) =>
        updatePrice({ ...price, publicationId: publication.id }).then(() => ({ type: 'update' as const, price })),
      ),
      ...newPrices.map((price) =>
        createPrice({ ...price, publicationId: publication.id }).then((created) => ({
          type: 'create' as const,
          price: { ...price, id: created.id },
        })),
      ),
      ...deletedPrices.map((price) => deletePrice(price.id).then(() => ({ type: 'delete' as const, price }))),
    ];

    const results = await Promise.allSettled(priceMutations);
    const successfulMutations = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failedMutation = results.find((result) => result.status === 'rejected');

    if (!failedMutation) {
      const createdPrices = successfulMutations
        .filter((result) => result.type === 'create')
        .map(({ price }) => price);

      setPublication({ ...publication, prices: [...existingPrices, ...createdPrices] });
      return;
    }

    if (successfulMutations.length > 0) {
      const reconciledPrices = successfulMutations.reduce<typeof prices>((currentPrices, mutation) => {
        if (mutation.type === 'delete') {
          return currentPrices.filter(({ id }) => id !== mutation.price.id);
        }

        const priceIndex = currentPrices.findIndex(({ id }) => id === mutation.price.id);

        if (priceIndex === -1) return [...currentPrices, mutation.price];

        return currentPrices.map((price, index) => (index === priceIndex ? mutation.price : price));
      }, publication.prices);

      setPublication({ ...publication, prices: reconciledPrices });

      // React Hook Form keeps its submitted values after a rejection. Remounting the
      // price form only when a create succeeded replaces its temporary id with the
      // reconciled server id while leaving the form open for the caller-visible error.
      if (successfulMutations.some(({ type }) => type === 'create')) {
        setPriceFormVersion((version) => version + 1);
      }
    }

    throw failedMutation.reason;
  };

  const updateLocations = async (data: LocationEntity[]) => {
    if (!publication) return false;

    const locations = selectCanonicalLocation(data);

    const newLocations = locations.filter(({ id }) => isDefaultId(id));
    const existingLocations = locations.filter(({ id }) => !isDefaultId(id));
    const notUpdatedLocations: LocationEntity[] = [];

    const updatedLocations = existingLocations.filter((location) => {
      const previousLocation = publication.locations.find(({ id }) => id === location.id);

      if (!previousLocation) return true;

      const keys = Object.keys(location) as (keyof LocationEntity)[];
      const isUpdated = keys.some((key) => previousLocation[key] !== location[key]);

      if (!isUpdated) {
        notUpdatedLocations.push(location);
      }

      return isUpdated;
    });

    // The backend allows exactly one canonical location per publication: promoting a
    // location demotes the current canonical one in the same transaction, while directly
    // demoting it or inserting a second one is rejected. So the promotion must be sent
    // before any demoted location's update, and a new location that should become
    // canonical must be created as non-canonical and promoted afterwards.
    const hasPersistedCanonical = publication.locations.some(({ canonical }) => canonical);
    const promotedLocations = updatedLocations.filter(({ canonical }) => canonical);
    const demotedLocations = updatedLocations.filter(({ canonical }) => !canonical);

    // Local state must hold the server ids of created locations right away: until the
    // work refetch lands, a re-edit of a location still stored with its temporary id
    // would be classified as new again and created twice.
    const createdLocations: LocationEntity[] = [];

    for (const location of promotedLocations) {
      await updateLocation({ ...location, publicationId: publication.id });
    }

    for (const location of newLocations) {
      const isDeferredCanonical = location.canonical && hasPersistedCanonical;
      const created = await createLocation({
        ...location,
        canonical: isDeferredCanonical ? false : location.canonical,
        publicationId: publication.id,
      });

      if (isDeferredCanonical) {
        await updateLocation({ ...location, id: created.id, publicationId: publication.id });
      }

      createdLocations.push({ ...location, id: created.id });
    }

    for (const location of demotedLocations) {
      await updateLocation({ ...location, publicationId: publication.id });
    }

    setPublication({ ...publication, locations: [...createdLocations, ...updatedLocations, ...notUpdatedLocations] });

    return true;
  };

  const deleteLocation = async (platformId: string) => {
    if (!publication) return;

    const item = publication.locations.find(({ id }) => id === platformId);

    if (!item || isDefaultId(item.id)) return;

    const updatedLocations = publication.locations.filter(({ id }) => id !== platformId);
    const updatedLocationsWithCanonical = selectCanonicalLocation(updatedLocations);

    // If the deleted location was canonical, its replacement must be promoted first,
    // which also demotes the location being deleted.
    const isCanonicalReassigned = await updateLocations(updatedLocationsWithCanonical);

    if (!isCanonicalReassigned) return;

    await deleteLocationMutation(platformId);

    setPublication({ ...publication, locations: updatedLocationsWithCanonical });
  };

  const updateFile = async (file: File) => {
    if (!publication) return;

    const url = await uploadPublicationFile(publication.id, file);

    setPublication({ ...publication, fileUrl: url });
  };

  return {
    activePublication: publication,
    priceFormVersion,
    loading,
    uploadProgress,
    defaultCurrencyOption,
    deleteLocationLoading: isDeleteLocationLoading,
    finishEditing,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibility,
    deleteAccessibility,
    updateFile,
  };
};
