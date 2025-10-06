'use client';

import { useState } from 'react';

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

  return {
    activePublication: publication,
    close,
    updateSizes,
    updateIsbn,
    updateType,
  };
};
