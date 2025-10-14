'use client';

import { type BaseEditSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useAddFunding } from './useAddFunding';

const AddFunding = (props: BaseEditSectionProps) => {
  const { queryToken, workId } = props;

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
  } = useAddFunding({ workId, queryToken });

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
