'use client';

import { EditReferenceForm, useReferencesStateMachine, useUpdateReference } from '@/src/entities/reference';
import type { BaseRecommendedSectionProps } from '@/src/shared';

const EditReference = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken } = props;

  const { activeReference, close } = useReferencesStateMachine();
  const { updateReference } = useUpdateReference({ workId, queryToken });

  const updateUrl = (url: string) => {
    if (!activeReference) return;

    updateReference({ ...activeReference, url });
  };

  const updateDoi = (doi: string) => {
    if (!activeReference) return;

    updateReference({ ...activeReference, doi });
  };

  const updateCitation = (citation: string) => {
    if (!activeReference) return;

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
      onDone={close}
      onClose={close}
    />
  );
};

export default EditReference;
