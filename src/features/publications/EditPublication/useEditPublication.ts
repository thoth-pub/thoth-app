'use client';

import { useState } from 'react';

import { useCreatePrice, useDeletePrice, useUpdatePrice } from '@/src/entities/price';
import type { CurrencyCode, PricesForm } from '@/src/entities/price/model/price.type';
import { usePublicationsStateMachine, useUpdatePublication } from '@/src/entities/publication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps } from '@/src/shared';

export const useEditPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activePublication, close } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);
  const { updatePublication } = useUpdatePublication({ workId, queryToken });
  const { createPrice } = useCreatePrice({ workId, queryToken });
  const { updatePrice } = useUpdatePrice({ workId, queryToken });
  const { deletePrice } = useDeletePrice({ workId, queryToken });

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

    const updatedPublication = { ...publication, type };

    updatePublication(updatedPublication);

    setPublication({ ...publication, type });
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

  return {
    activePublication: publication,
    close,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
  };
};
