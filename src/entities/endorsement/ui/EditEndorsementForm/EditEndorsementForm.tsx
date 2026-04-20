'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import { EditEndorsementAuthorInstitution } from '../EditEndorsementAuthorInstitution/EditEndorsementAuthorInstitution';
import { EditEndorsementAuthorName } from '../EditEndorsementAuthorName/EditEndorsementAuthorName';
import { EditEndorsementAuthorOrcid } from '../EditEndorsementAuthorOrcid/EditEndorsementAuthorOrcid';
import { EditEndorsementAuthorRole } from '../EditEndorsementAuthorRole/EditEndorsementAuthorRole';
import { EditEndorsementText } from '../EditEndorsementText/EditEndorsementText';
import { EditEndorsementUrl } from '../EditEndorsementUrl/EditEndorsementUrl';

type EditEndorsementFormProps = {
  authorName?: string;
  authorOrcid?: string;
  authorRole?: string;
  authorInstitutionId?: string;
  authorInstitutionName?: string;
  url?: string;
  text?: string;
  isDoneDisabled?: boolean;
  onAuthorNameUpdate?: (data: string) => void;
  onAuthorOrcidUpdate?: (data: string) => void;
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
    authorOrcid,
    authorRole,
    authorInstitutionId,
    authorInstitutionName,
    url,
    text,
    isDoneDisabled,
    onAuthorNameUpdate,
    onAuthorOrcidUpdate,
    onAuthorRoleUpdate,
    onAuthorInstitutionUpdate,
    onUrlUpdate,
    onTextUpdate,
    onDone,
    onClose,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="endorsement" onDone={onDone} onClose={onClose} isDoneDisabled={isDoneDisabled} />
      <EditEndorsementAuthorName defaultValue={authorName} onUpdate={onAuthorNameUpdate} />
      <EditEndorsementAuthorOrcid defaultValue={authorOrcid} onUpdate={onAuthorOrcidUpdate} />
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
