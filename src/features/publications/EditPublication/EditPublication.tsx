'use client';

import { useState } from 'react';

import { EditPublication as EditPublicationForm, usePublicationsStateMachine } from '@/src/entities/publication';
import type { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import type { BaseRecommendedSectionProps } from '@/src/shared';

type EditPublicationProps = BaseRecommendedSectionProps & {
  isDimensionFormHidden: boolean;
};

const EditPublication = (props: EditPublicationProps) => {
  const { workId, queryToken, recommended = false, isDimensionFormHidden = false } = props;

  const { activePublication } = usePublicationsStateMachine();
  const [publication, setPublication] = useState<PublicationEntity | null>(activePublication);

  if (!publication) return null;

  return (
    <EditPublicationForm
      title="Edit Publication"
      showRecommendations={recommended}
      isDimensionFormHidden={isDimensionFormHidden}
      publicationType={publication.type}
      isbn={publication.isbn}
      width={publication.width}
      height={publication.height}
      depth={publication.depth}
      weight={publication.weight}
      onUpdateIsbn={() => {}}
      onUpdateType={() => {}}
      onDone={() => {}}
      onClose={() => {}}
      onUpdateDimensions={() => {}}
    />
  );
};

export default EditPublication;
