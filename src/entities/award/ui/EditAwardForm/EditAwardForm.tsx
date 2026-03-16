'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import type { AwardRole } from '../../model/award.types';
import { EditAwardCategory } from '../EditAwardCategory/EditAwardCategory';
import { EditAwardRole } from '../EditAwardRole/EditAwardRole';
import { EditAwardStatement } from '../EditAwardStatement/EditAwardStatement';
import { EditAwardTitle } from '../EditAwardTitle/EditAwardTitle';
import { EditAwardUrl } from '../EditAwardUrl/EditAwardUrl';

type EditAwardFormProps = {
  title?: string;
  url?: string;
  category?: string;
  statement?: string;
  role?: AwardRole | null;
  onTitleUpdate?: (data: string) => void;
  onUrlUpdate?: (data: string) => void;
  onCategoryUpdate?: (data: string) => void;
  onStatementUpdate?: (data: string) => void;
  onRoleUpdate?: (data: AwardRole | null) => void;
  onDone?: () => void;
  onClose?: () => void;
  isDoneDisabled?: boolean;
};

const EditAwardForm = (props: EditAwardFormProps) => {
  const {
    title,
    url,
    category,
    statement,
    role,
    onTitleUpdate,
    onUrlUpdate,
    onCategoryUpdate,
    onStatementUpdate,
    onRoleUpdate,
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
      <EditAwardStatement defaultValue={statement} onUpdate={onStatementUpdate} />
      <EditAwardRole defaultValue={role} onUpdate={onRoleUpdate} />
    </TableFormsWrapper>
  );
};

export default EditAwardForm;
