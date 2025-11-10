'use client';

import { type BaseEditSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useAddFunding } from './useAddFunding';
import { FundingEntity } from '@/src/entities/funding/model/funding.types';

type AddFundingProps = BaseEditSectionProps & {
  onCreate?: (funding: FundingEntity) => void;
};

const AddFunding = (props: AddFundingProps) => {
  const { queryToken, workId, onCreate } = props;

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
  } = useAddFunding({ workId, queryToken, onCreate });

  if (!funding) return null;

  const { grantNumber, jurisdiction, program, projectName, projectShortname, institutionId, institutionName } = funding;

  return (
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
  );
};

export default AddFunding;
