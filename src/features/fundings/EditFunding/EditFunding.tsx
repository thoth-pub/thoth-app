'use client';

import type { BaseRecommendedSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useEditFunding } from './useEditFunding';
import { FundingEntity } from '@/src/entities/funding/model/funding.types';

type EditFundingProps = BaseRecommendedSectionProps & {
  skipAutosave?: boolean;
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
    queryToken,
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
    queryToken,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onJurisdictionUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  });

  if (!activeFunding) return null;

  const {
    skipAutosave = false,
    grantNumber,
    jurisdiction,
    program,
    projectName,
    projectShortname,
    institutionId,
    institutionName,
  } = activeFunding;

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
