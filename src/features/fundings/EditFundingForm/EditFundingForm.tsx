'use client';

import {
  EditGrantNumberForm,
  EditProgramForm,
  EditProjectNameForm,
  EditProjectShortNameForm,
} from '@/src/entities/funding';
import type {
  FundingGrantNumberFormType,
  FundingProgramFormType,
  FundingProjectNameFormType,
  FundingProjectShortNameFormType,
} from '@/src/entities/funding/model/funding.types';
import { EditInstitutionForm } from '@/src/entities/institution';
import { InstitutionFormType } from '@/src/entities/institution/model/institution.types';
import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

type EditFundingProps = {
  grantNumber: string;
  institution: { value: string; label: string };
  program: string;
  projectName: string;
  projectShortname: string;
  onProjectUpdate?: (data: FundingProjectNameFormType) => void;
  onProjectShortNameUpdate?: (data: FundingProjectShortNameFormType) => void;
  onProgramUpdate?: (data: FundingProgramFormType) => void;
  onGrantNumberUpdate?: (data: FundingGrantNumberFormType) => void;
  onInstitutionUpdate?: (data: InstitutionFormType) => void;
  onDone?: () => void;
  onClose?: () => void;
  recommended?: boolean;
};

const EditFundingForm = (props: EditFundingProps) => {
  const {
    institution,
    program,
    projectName,
    projectShortname,
    grantNumber,
    recommended,
    onDone,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
    onClose,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="funding" onDone={onDone} onClose={onClose} />
      <EditInstitutionForm defaultValue={institution} onUpdate={(data) => onInstitutionUpdate?.(data)} />
      <EditProgramForm defaultValue={program} onUpdate={(data) => onProgramUpdate?.(data)} />
      <EditProjectNameForm defaultValue={projectName} onUpdate={(data) => onProjectUpdate?.(data)} />
      <EditProjectShortNameForm defaultValue={projectShortname} onUpdate={(data) => onProjectShortNameUpdate?.(data)} />
      <EditGrantNumberForm
        defaultValue={grantNumber}
        recommended={recommended}
        onUpdate={(data) => onGrantNumberUpdate?.(data)}
      />
    </TableFormsWrapper>
  );
};

export default EditFundingForm;
