'use client';

import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

import EditFundingForm from '../EditFundingForm/EditFundingForm';
import { useEditFunding } from './useEditFunding';

type EditFundingProps = BaseRecommendedSectionProps & {
  onProjectUpdate?: (funding: FundingEntity) => void;
  onProjectShortNameUpdate?: (funding: FundingEntity) => void;
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
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  } = props;

  const {
    activeFunding,
    close,
    updateProject,
    updateProjectShortName,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  } = useEditFunding({
    workId,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  });

  if (!activeFunding) return null;

  const { grantNumber, program, projectName, projectShortname, institutionId, institutionName } = activeFunding;

  return (
    <EditFundingForm
      recommended={recommended}
      grantNumber={grantNumber}
      institution={{ value: institutionId, label: institutionName }}
      program={program}
      projectName={projectName}
      projectShortname={projectShortname}
      onProjectUpdate={updateProject}
      onProjectShortNameUpdate={updateProjectShortName}
      onProgramUpdate={updateProgram}
      onGrantNumberUpdate={updateGrantNumber}
      onInstitutionUpdate={updateInstitution}
      onDone={close}
      onClose={close}
    />
  );
};

export default EditFunding;
