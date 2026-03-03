'use client';

import { useFundingStateMachine, useUpdateFunding } from '@/src/entities/funding';
import type {
  FundingEntity,
  FundingGrantNumberFormType,
  FundingProgramFormType,
  FundingProjectNameFormType,
  FundingProjectShortNameFormType,
} from '@/src/entities/funding/model/funding.types';
import { InstitutionFormType } from '@/src/entities/institution/model/institution.types';
import type { BaseEditSectionProps } from '@/src/shared/types';

type UseEditFundingProps = BaseEditSectionProps & {
  onProjectUpdate?: (funding: FundingEntity) => void;
  onProjectShortNameUpdate?: (funding: FundingEntity) => void;
  onProgramUpdate?: (funding: FundingEntity) => void;
  onGrantNumberUpdate?: (funding: FundingEntity) => void;
  onInstitutionUpdate?: (funding: FundingEntity) => void;
};

export const useEditFunding = (props: UseEditFundingProps) => {
  const {
    workId,
    onProjectUpdate,
    onProjectShortNameUpdate,
    onProgramUpdate,
    onGrantNumberUpdate,
    onInstitutionUpdate,
  } = props;

  const { activeEntity: activeFunding, close, update } = useFundingStateMachine();
  const { updateFunding } = useUpdateFunding({ workId });

  const updateProject = ({ projectName }: FundingProjectNameFormType) => {
    if (!activeFunding || !projectName) return;

    const updatedFunding = { ...activeFunding, projectName };

    update(updatedFunding);

    if (onProjectUpdate) {
      onProjectUpdate(updatedFunding);
      return;
    }

    updateFunding(updatedFunding);
  };

  const updateProjectShortName = ({ projectShortname }: FundingProjectShortNameFormType) => {
    if (!activeFunding || !projectShortname) return;

    const updatedFunding = { ...activeFunding, projectShortname };

    update(updatedFunding);

    if (onProjectShortNameUpdate) {
      onProjectShortNameUpdate(updatedFunding);
      return;
    }

    updateFunding(updatedFunding);
  };

  const updateProgram = ({ program }: FundingProgramFormType) => {
    if (!activeFunding || !program) return;

    const updatedFunding = { ...activeFunding, program };

    update(updatedFunding);

    if (onProgramUpdate) {
      onProgramUpdate(updatedFunding);
      return;
    }

    updateFunding(updatedFunding);
  };

  const updateGrantNumber = ({ grantNumber }: FundingGrantNumberFormType) => {
    if (!activeFunding || !grantNumber) return;

    const updatedFunding = { ...activeFunding, grantNumber };

    update(updatedFunding);

    if (onGrantNumberUpdate) {
      onGrantNumberUpdate(updatedFunding);
      return;
    }

    updateFunding({ ...activeFunding, grantNumber });
  };

  const updateInstitution = (data: InstitutionFormType) => {
    if (!activeFunding) return;

    const updatedFunding = { ...activeFunding, institutionId: data.institution.value };

    update(updatedFunding);

    if (onInstitutionUpdate) {
      onInstitutionUpdate(updatedFunding);
      return;
    }

    updateFunding(updatedFunding);
  };

  return {
    activeFunding,
    close,
    updateProject,
    updateProjectShortName,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  };
};
