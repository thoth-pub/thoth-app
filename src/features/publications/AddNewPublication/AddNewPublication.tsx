'use client';

import { useState } from 'react';

import { EditPublication, usePublicationsStateMachine } from '@/src/entities/publication';
import type {
  PublicationDimensionsForm,
  PublicationEntity,
  PublicationType,
} from '@/src/entities/publication/model/publication.types';
import type { BaseEditSectionProps } from '@/src/shared';

const AddNewPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activePublication, close } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);

  const create = () => {
    if (!publication) return;

    console.log('publication', publication);
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

    setPublication({ ...publication, ...dimensions });
  };

  if (!publication) return null;

  return (
    <EditPublication
      title="Add New Publication"
      publicationType={activePublication.type}
      isbn={activePublication.isbn}
      width={activePublication.width}
      height={activePublication.height}
      depth={activePublication.depth}
      weight={activePublication.weight}
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onClose={close}
      onUpdateDimensions={updateDimensions}
    />
  );
};

export default AddNewPublication;
