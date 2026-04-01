'use client';

import { useState } from 'react';

import { EditEndorsementForm, useCreateEndorsement, useEndorsementStateMachine } from '@/src/entities/endorsement';
import type { EndorsementEntity } from '@/src/entities/endorsement/model/endorsement.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

type AddEndorsementProps = BaseRecommendedSectionProps & {
  endorsements?: EndorsementEntity[];
};

const emptyEndorsements: EndorsementEntity[] = [];

const AddEndorsement = (props: AddEndorsementProps) => {
  const { workId, endorsements = emptyEndorsements } = props;

  const { activeEntity: activeEndorsement, finishEditing } = useEndorsementStateMachine();
  const [endorsement, setEndorsement] = useState<EndorsementEntity | null>(activeEndorsement);
  const { createEndorsement } = useCreateEndorsement({ workId });

  const create = () => {
    if (!endorsement) return;

    const lastEndorsementOrderNumber = [...endorsements].sort((a, b) => b.orderNumber - a.orderNumber)[0]
      ?.orderNumber;

    createEndorsement({
      ...endorsement,
      orderNumber: lastEndorsementOrderNumber ? lastEndorsementOrderNumber + 1 : 1,
    });
    finishEditing();
  };

  const updateAuthorName = (authorName: string) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, authorName });
  };

  const updateAuthorOrcid = (authorOrcid: string) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, authorOrcid });
  };

  const updateAuthorRole = (authorRole: string) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, authorRole });
  };

  const updateUrl = (url: string) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, url });
  };

  const updateAuthorInstitution = (data: { value: string; label: string; ror: string }) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, authorInstitutionId: data.value, authorInstitutionName: data.label, authorInstitutionRor: data.ror });
  };

  const updateText = (text: string) => {
    if (!endorsement) return;

    setEndorsement({ ...endorsement, text });
  };

  if (!endorsement) return null;

  const { authorName, authorOrcid, authorRole, authorInstitutionId, authorInstitutionName, url, text } = endorsement;

  return (
    <TableNewEntityFormWrapper>
      <EditEndorsementForm
        authorName={authorName}
        authorOrcid={authorOrcid}
        authorRole={authorRole}
        authorInstitutionId={authorInstitutionId}
        authorInstitutionName={authorInstitutionName}
        url={url}
        text={text}
        onAuthorNameUpdate={updateAuthorName}
        onAuthorOrcidUpdate={updateAuthorOrcid}
        onAuthorRoleUpdate={updateAuthorRole}
        onAuthorInstitutionUpdate={updateAuthorInstitution}
        onUrlUpdate={updateUrl}
        onTextUpdate={updateText}
        onDone={create}
        onClose={finishEditing}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddEndorsement;
