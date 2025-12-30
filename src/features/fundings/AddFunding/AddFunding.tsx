'use client';

import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import { type BaseEditSectionProps } from '@/src/shared';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useAddFunding } from './useAddFunding';

type AddFundingProps = BaseEditSectionProps & {
  onCreate?: (funding: FundingEntity) => void;
};

const AddFunding = (props: AddFundingProps) => {
  const { workId, onCreate } = props;

  const {
    funding,
    close,
    create,
    updateProject,
    updateProjectShortName,
    updateJurisdiction,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  } = useAddFunding({ workId, onCreate });

  if (!funding) return null;

  const { grantNumber, jurisdiction, program, projectName, projectShortname, institutionId, institutionName } = funding;

  return (
    <TableNewEntityFormWrapper>
      <EditFundingForm
        grantNumber={grantNumber}
        institution={{ value: institutionId, label: institutionName }}
        jurisdiction={jurisdiction}
        program={program}
        projectName={projectName}
        projectShortname={projectShortname}
        onProjectUpdate={updateProject}
        onProjectShortNameUpdate={updateProjectShortName}
        onJurisdictionUpdate={updateJurisdiction}
        onProgramUpdate={updateProgram}
        onGrantNumberUpdate={updateGrantNumber}
        onInstitutionUpdate={updateInstitution}
        onDone={create}
        onClose={close}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddFunding;
