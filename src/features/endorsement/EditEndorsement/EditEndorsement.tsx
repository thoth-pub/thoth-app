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

  const updateAuthorOrcid = (authorOrcid: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, authorOrcid });
    updateEndorsement({ ...activeEndorsement, authorOrcid });
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

  const updateAuthorInstitution = (data: { value: string; label: string; ror: string }) => {
    if (!activeEndorsement) return;

    update({
      ...activeEndorsement,
      authorInstitutionId: data.value,
      authorInstitutionName: data.label,
      authorInstitutionRor: data.ror,
    });
    updateEndorsement({
      ...activeEndorsement,
      authorInstitutionId: data.value,
      authorInstitutionName: data.label,
      authorInstitutionRor: data.ror,
    });
  };

  const updateText = (text: string) => {
    if (!activeEndorsement) return;

    update({ ...activeEndorsement, text });
    updateEndorsement({ ...activeEndorsement, text });
  };

  if (!activeEndorsement) return null;

  const { authorName, authorOrcid, authorRole, authorInstitutionId, authorInstitutionName, url, text } =
    activeEndorsement;

  return (
    <EditEndorsementForm
      authorName={authorName}
      authorOrcid={authorOrcid}
      authorRole={authorRole}
      authorInstitutionId={authorInstitutionId}
      authorInstitutionName={authorInstitutionName}
      url={url}
      text={text}
      isDoneDisabled={!authorName?.trim()}
      onAuthorNameUpdate={updateAuthorName}
      onAuthorOrcidUpdate={updateAuthorOrcid}
      onAuthorRoleUpdate={updateAuthorRole}
      onAuthorInstitutionUpdate={updateAuthorInstitution}
      onUrlUpdate={updateUrl}
      onTextUpdate={updateText}
      onDone={finishEditing}
      onClose={finishEditing}
    />
  );
};

export default EditEndorsement;
