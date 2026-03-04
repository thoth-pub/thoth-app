'use client';

import { useState } from 'react';

import { useCreateFunding, useFundingStateMachine } from '@/src/entities/funding';
import type {
  FundingEntity,
  FundingGrantNumberFormType,
  FundingProgramFormType,
  FundingProjectNameFormType,
  FundingProjectShortNameFormType,
} from '@/src/entities/funding/model/funding.types';
import { InstitutionFormType } from '@/src/entities/institution/model/institution.types';
import type { BaseEditSectionProps } from '@/src/shared/types';

type UseAddFundingProps = BaseEditSectionProps & {
  onCreate?: (funding: FundingEntity) => void;
};

export const useAddFunding = (props: UseAddFundingProps) => {
  const { workId, onCreate } = props;

  const { activeEntity: activeFunding, finishEditing } = useFundingStateMachine();
  const { createFunding } = useCreateFunding({
    workId,
  });

  const [funding, setFunding] = useState<FundingEntity | null>(activeFunding);

  const create = () => {
    if (!funding) return;

    if (onCreate) {
      onCreate(funding);
      finishEditing();
      return;
    }

    createFunding(funding);
    finishEditing();
  };

  const updateProject = ({ projectName }: FundingProjectNameFormType) => {
    if (!funding || !projectName) return;

    setFunding({ ...funding, projectName });
  };

  const updateProjectShortName = ({ projectShortname }: FundingProjectShortNameFormType) => {
    if (!funding || !projectShortname) return;

    setFunding({ ...funding, projectShortname });
  };

  const updateProgram = ({ program }: FundingProgramFormType) => {
    if (!funding || !program) return;

    setFunding({ ...funding, program });
  };

  const updateGrantNumber = ({ grantNumber }: FundingGrantNumberFormType) => {
    if (!funding || !grantNumber) return;

    setFunding({ ...funding, grantNumber });
  };

  const updateInstitution = (data: InstitutionFormType) => {
    if (!funding) return;

    setFunding({ ...funding, institutionId: data.institution.value });
  };

  return {
    funding,
    finishEditing,
    create,
    updateProject,
    updateProjectShortName,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  };
};
