'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import { EditAwardCategory } from '../EditAwardCategory/EditAwardCategory';
import { EditAwardNote } from '../EditAwardNote/EditAwardNote';
import { EditAwardTitle } from '../EditAwardTitle/EditAwardTitle';
import { EditAwardUrl } from '../EditAwardUrl/EditAwardUrl';

type EditAwardFormProps = {
  title?: string;
  url?: string;
  category?: string;
  note?: string;
  onTitleUpdate?: (data: string) => void;
  onUrlUpdate?: (data: string) => void;
  onCategoryUpdate?: (data: string) => void;
  onNoteUpdate?: (data: string) => void;
  onDone?: () => void;
  onClose?: () => void;
  isDoneDisabled?: boolean;
};

const EditAwardForm = (props: EditAwardFormProps) => {
  const {
    title,
    url,
    category,
    note,
    onTitleUpdate,
    onUrlUpdate,
    onCategoryUpdate,
    onNoteUpdate,
    onDone,
    onClose,
    isDoneDisabled,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="award" onDone={onDone} onClose={onClose} isDoneDisabled={isDoneDisabled} />
      <EditAwardTitle defaultValue={title} onUpdate={onTitleUpdate} />
      <EditAwardCategory defaultValue={category} onUpdate={onCategoryUpdate} />
      <EditAwardUrl defaultValue={url} onUpdate={onUrlUpdate} />
      <EditAwardNote defaultValue={note} onUpdate={onNoteUpdate} />
    </TableFormsWrapper>
  );
};

export default EditAwardForm;
