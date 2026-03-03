'use client';

import { useState } from 'react';

import { EditReferenceForm, useCreateReference, useReferenceStateMachine } from '@/src/entities/reference';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { useWork } from '@/src/entities/work';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

const AddReference = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeReference, close } = useReferenceStateMachine();
  const { work } = useWork(workId);
  const [reference, setReference] = useState<ReferenceEntity | null>(activeReference);
  const { createReference } = useCreateReference({ workId });

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
    <TableNewEntityFormWrapper>
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
    </TableNewEntityFormWrapper>
  );
};

export default AddReference;
