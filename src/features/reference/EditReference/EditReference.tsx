'use client';

import { EditReferenceForm, useReferenceStateMachine, useUpdateReference } from '@/src/entities/reference';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

const EditReference = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeReference, update, finishEditing } = useReferenceStateMachine();
  const { updateReference } = useUpdateReference({ workId });

  const updateUrl = (url: string) => {
    if (!activeReference) return;

    update({ ...activeReference, url });
    updateReference({ ...activeReference, url });
  };

  const updateDoi = (doi: string) => {
    if (!activeReference) return;

    update({ ...activeReference, doi });
    updateReference({ ...activeReference, doi });
  };

  const updateCitation = (citation: string) => {
    if (!activeReference) return;

    update({ ...activeReference, unstructuredCitation: citation });
    updateReference({ ...activeReference, unstructuredCitation: citation });
  };

  if (!activeReference) return null;

  const { url, doi, unstructuredCitation } = activeReference;

  return (
    <EditReferenceForm
      url={url}
      doi={doi}
      citation={unstructuredCitation}
      onUrlUpdate={updateUrl}
      onDoiUpdate={updateDoi}
      onCitationUpdate={updateCitation}
      onDone={finishEditing}
      onClose={finishEditing}
    />
  );
};

export default EditReference;
