'use client';

import { useState } from 'react';

import { EditReferenceForm, useCreateReference, useReferencesStateMachine } from '@/src/entities/reference';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { useWork } from '@/src/entities/work';
import { type BaseRecommendedSectionProps } from '@/src/shared';

const AddReference = (props: BaseRecommendedSectionProps) => {
  const { queryToken, workId } = props;

  const { activeReference, close } = useReferencesStateMachine();
  const { work } = useWork(workId, queryToken);
  const [reference, setReference] = useState<ReferenceEntity | null>(activeReference);
  const { createReference } = useCreateReference({ workId, queryToken });

  const create = () => {
    if (!reference) return;

    const lastReferenceOrderNumber = work.references.sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber;

    createReference({
      ...reference,
      orderNumber: lastReferenceOrderNumber ? lastReferenceOrderNumber + 1 : 1,
    });
    close();
  };

  const updateUrl = (url: string) => {
    if (!reference) return;

    setReference({ ...reference, url });
  };

  const updateDoi = (doi: string) => {
    if (!reference) return;

    setReference({ ...reference, doi });
  };

  const updateCitation = (citation: string) => {
    if (!reference) return;

    setReference({ ...reference, unstructuredCitation: citation });
  };

  if (!reference) return null;

  const { url, doi, unstructuredCitation } = reference;

  return (
    <EditReferenceForm
      url={url}
      doi={doi}
      citation={unstructuredCitation}
      onUrlUpdate={updateUrl}
      onDoiUpdate={updateDoi}
      onCitationUpdate={updateCitation}
      onDone={create}
      onClose={close}
    />
  );
};

export default AddReference;
