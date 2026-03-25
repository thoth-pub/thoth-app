'use client';

import type { CountryCode } from '@/gql/graphql';
import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import type { AwardRole } from '../../model/award.types';
import { EditAwardCategory } from '../EditAwardCategory/EditAwardCategory';
import { EditAwardCountry } from '../EditAwardCountry/EditAwardCountry';
import { EditAwardJury } from '../EditAwardJury/EditAwardJury';
import { EditAwardRole } from '../EditAwardRole/EditAwardRole';
import { EditAwardStatement } from '../EditAwardStatement/EditAwardStatement';
import { EditAwardTitle } from '../EditAwardTitle/EditAwardTitle';
import { EditAwardUrl } from '../EditAwardUrl/EditAwardUrl';
import { EditAwardYear } from '../EditAwardYear/EditAwardYear';

type EditAwardFormProps = {
  title?: string;
  url?: string;
  category?: string;
  statement?: string;
  role?: AwardRole | null;
  jury?: string;
  year?: string;
  country?: CountryCode | null;
  onTitleUpdate?: (data: string) => void;
  onUrlUpdate?: (data: string) => void;
  onCategoryUpdate?: (data: string) => void;
  onStatementUpdate?: (data: string) => void;
  onRoleUpdate?: (data: AwardRole | null) => void;
  onJuryUpdate?: (data: string) => void;
  onYearUpdate?: (data: string) => void;
  onCountryUpdate?: (data: CountryCode | null) => void;
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
    jury,
    year,
    country,
    onTitleUpdate,
    onUrlUpdate,
    onCategoryUpdate,
    onStatementUpdate,
    onRoleUpdate,
    onJuryUpdate,
    onYearUpdate,
    onCountryUpdate,
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
      <EditAwardJury defaultValue={jury} onUpdate={onJuryUpdate} />
      <EditAwardYear defaultValue={year} onUpdate={onYearUpdate} />
      <EditAwardCountry defaultValue={country} onUpdate={onCountryUpdate} />
    </TableFormsWrapper>
  );
};

export default EditAwardForm;
