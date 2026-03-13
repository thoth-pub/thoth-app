'use client';

import { EditEndorsementForm, useEndorsementStateMachine, useUpdateEndorsement } from '@/src/entities/endorsement';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

const EditEndorsement = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeEndorsement, update, finishEditing } = useEndorsementStateMachine();
  const { updateEndorsement } = useUpdateEndorsement({ workId });

  const updateAuthorName = (authorName: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, authorName });
    updateEndorsement({ ...activeEndorsement, authorName });
  };

  const updateAuthorRole = (authorRole: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, authorRole });
    updateEndorsement({ ...activeEndorsement, authorRole });
  };

  const updateUrl = (url: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, url });
    updateEndorsement({ ...activeEndorsement, url });
  };

  const updateText = (text: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, text });
    updateEndorsement({ ...activeEndorsement, text });
  };

  if (!activeEndorsement) return null;

  const { authorName, authorRole, url, text } = activeEndorsement;

  return (
    <EditEndorsementForm
      authorName={authorName}
      authorRole={authorRole}
      url={url}
      text={text}
      onAuthorNameUpdate={updateAuthorName}
      onAuthorRoleUpdate={updateAuthorRole}
      onUrlUpdate={updateUrl}
      onTextUpdate={updateText}
      onDone={finishEditing}
      onClose={finishEditing}
    />
  );
};

export default EditEndorsement;
