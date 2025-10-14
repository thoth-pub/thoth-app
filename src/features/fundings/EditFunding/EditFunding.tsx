'use client';

import type { BaseRecommendedSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useEditFunding } from './useEditFunding';

const EditFunding = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const {
    activeFunding,
    close,
    updateProject,
    updateProjectShortName,
    updateJurisdiction,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  } = useEditFunding({ workId, queryToken });

  if (!activeFunding) return null;

  const { grantNumber, jurisdiction, program, projectName, projectShortname, institutionId, institutionName } =
    activeFunding;

  return (
    <EditFundingForm
      recommended={recommended}
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
      onDone={close}
      onClose={close}
    />
  );
};

export default EditFunding;
