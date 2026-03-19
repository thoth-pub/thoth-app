'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import { EditEndorsementAuthorInstitution } from '../EditEndorsementAuthorInstitution/EditEndorsementAuthorInstitution';
import { EditEndorsementAuthorName } from '../EditEndorsementAuthorName/EditEndorsementAuthorName';
import { EditEndorsementAuthorRole } from '../EditEndorsementAuthorRole/EditEndorsementAuthorRole';
import { EditEndorsementText } from '../EditEndorsementText/EditEndorsementText';
import { EditEndorsementUrl } from '../EditEndorsementUrl/EditEndorsementUrl';

type EditEndorsementFormProps = {
  authorName?: string;
  authorRole?: string;
  authorInstitutionId?: string;
  authorInstitutionName?: string;
  url?: string;
  text?: string;
  onAuthorNameUpdate?: (data: string) => void;
  onAuthorRoleUpdate?: (data: string) => void;
  onAuthorInstitutionUpdate?: (data: { value: string; label: string; ror: string }) => void;
  onUrlUpdate?: (data: string) => void;
  onTextUpdate?: (data: string) => void;
  onDone?: () => void;
  onClose?: () => void;
};

const EditEndorsementForm = (props: EditEndorsementFormProps) => {
  const {
    authorName,
    authorRole,
    authorInstitutionId,
    authorInstitutionName,
    url,
    text,
    onAuthorNameUpdate,
    onAuthorRoleUpdate,
    onAuthorInstitutionUpdate,
    onUrlUpdate,
    onTextUpdate,
    onDone,
    onClose,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="endorsement" onDone={onDone} onClose={onClose} />
      <EditEndorsementAuthorName defaultValue={authorName} onUpdate={onAuthorNameUpdate} />
      <EditEndorsementAuthorRole defaultValue={authorRole} onUpdate={onAuthorRoleUpdate} />
      <EditEndorsementAuthorInstitution
        defaultValue={{ value: authorInstitutionId ?? '', label: authorInstitutionName ?? '' }}
        onUpdate={onAuthorInstitutionUpdate}
      />
      <EditEndorsementUrl defaultValue={url} onUpdate={onUrlUpdate} />
      <EditEndorsementText defaultValue={text} onUpdate={onTextUpdate} />
    </TableFormsWrapper>
  );
};

export default EditEndorsementForm;
