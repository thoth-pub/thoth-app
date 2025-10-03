'use client';

import { useState } from 'react';

import { usePublicationsStateMachine } from '@/src/entities/publication';
import useCreatePublication from '@/src/entities/publication/api/hooks/useCreatePublication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps, convertInToMm, convertOzToG, LengthUnit, WeightUnit } from '@/src/shared';

export const useAddNewPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activePublication, close } = usePublicationsStateMachine();
  const { createPublication } = useCreatePublication({ workId, queryToken });
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);

  const create = () => {
    if (!publication) return;

    createPublication(publication);

    close();
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

  return {
    publication,
    close,
    create,
    updateType,
    updateIsbn,
    updateDimensions,
  };
};
