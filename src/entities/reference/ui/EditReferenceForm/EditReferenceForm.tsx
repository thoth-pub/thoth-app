'use client';

import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

import { EditReferenceCitation } from '../EditReferenceCitation/EditReferenceCitation';
import { EditReferenceDoi } from '../EditReferenceDoi/EditReferenceDoi';
import { EditReferenceUrl } from '../EditReferenceUrl/EditReferenceUrl';

type EditReferenceFormProps = {
  url?: string;
  doi?: string;
  citation?: string;
  recommended?: boolean;
  onUrlUpdate?: (data: string) => void;
  onDoiUpdate?: (data: string) => void;
  onCitationUpdate?: (data: string) => void;
  onDone?: () => void;
  onClose?: () => void;
};

const EditReferenceForm = (props: EditReferenceFormProps) => {
  const {
    url,
    recommended = false,
    doi,
    citation,
    onUrlUpdate,
    onDoiUpdate,
    onCitationUpdate,
    onDone,
    onClose,
  } = props;

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title="Reference" onDone={onDone} onClose={onClose} />
        <EditReferenceDoi defaultValue={doi} recommended={recommended} onUpdate={onDoiUpdate} />
        <EditReferenceCitation defaultValue={citation} recommended={recommended} onUpdate={onCitationUpdate} />
        <EditReferenceUrl defaultValue={url} onUpdate={onUrlUpdate} />
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditReferenceForm;
