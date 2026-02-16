'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import { EditReferenceCitation } from '../EditReferenceCitation/EditReferenceCitation';
import { EditReferenceDoi } from '../EditReferenceDoi/EditReferenceDoi';
import { EditReferenceUrl } from '../EditReferenceUrl/EditReferenceUrl';

type EditReferenceFormProps = {
  url?: string;
  doi?: string;
  citation?: string;
  onUrlUpdate?: (data: string) => void;
  onDoiUpdate?: (data: string) => void;
  onCitationUpdate?: (data: string) => void;
  onDone?: () => void;
  onClose?: () => void;
};

const EditReferenceForm = (props: EditReferenceFormProps) => {
  const { url, doi, citation, onUrlUpdate, onDoiUpdate, onCitationUpdate, onDone, onClose } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="reference" onDone={onDone} onClose={onClose} />
      <EditReferenceDoi defaultValue={doi} onUpdate={onDoiUpdate} />
      <EditReferenceCitation defaultValue={citation} onUpdate={onCitationUpdate} />
      <EditReferenceUrl defaultValue={url} onUpdate={onUrlUpdate} />
    </TableFormsWrapper>
  );
};

export default EditReferenceForm;
