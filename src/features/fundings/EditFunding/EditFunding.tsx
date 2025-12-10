'use client';

import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useEditFunding } from './useEditFunding';

type EditFundingProps = BaseRecommendedSectionProps & {
  onProjectUpdate?: (funding: FundingEntity) => void;
  onProjectShortNameUpdate?: (funding: FundingEntity) => void;
  onJurisdictionUpdate?: (funding: FundingEntity) => void;
  onProgramUpdate?: (funding: FundingEntity) => void;
  onGrantNumberUpdate?: (funding: FundingEntity) => void;
  onInstitutionUpdate?: (funding: FundingEntity) => void;
};

const EditFunding = (props: EditFundingProps) => {
  const {
    workId,
    recommended = false,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onJurisdictionUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  } = props;

  const {
    activeFunding,
    close,
    updateProject,
    updateProjectShortName,
    updateJurisdiction,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  } = useEditFunding({
    workId,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onJurisdictionUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  });

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
