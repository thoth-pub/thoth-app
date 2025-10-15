'use client';

import { useState } from 'react';

import { useCreateFunding, useFundingsStateMachine } from '@/src/entities/funding';
import type {
  FundingEntity,
  FundingGrantNumberFormType,
  FundingJurisdictionFormType,
  FundingProgramFormType,
  FundingProjectNameFormType,
  FundingProjectShortNameFormType,
} from '@/src/entities/funding/model/funding.types';
import { InstitutionFormType } from '@/src/entities/institution/model/institution.types';
import { type BaseEditSectionProps } from '@/src/shared';

export const useAddFunding = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activeFunding, close } = useFundingsStateMachine();
  const { createFunding } = useCreateFunding({
    queryToken,
    workId,
  });

  const [funding, setFunding] = useState<FundingEntity | null>(activeFunding);

  const create = () => {
    if (!funding) return;

    createFunding({
      ...funding,
    });
    close();
  };

  const updateProject = ({ projectName }: FundingProjectNameFormType) => {
    if (!funding || !projectName) return;

    setFunding({ ...funding, projectName });
  };

  const updateProjectShortName = ({ projectShortname }: FundingProjectShortNameFormType) => {
    if (!funding || !projectShortname) return;

    setFunding({ ...funding, projectShortname });
  };

  const updateJurisdiction = ({ jurisdiction }: FundingJurisdictionFormType) => {
    if (!funding || !jurisdiction) return;

    setFunding({ ...funding, jurisdiction });
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
    close,
    create,
    updateProject,
    updateProjectShortName,
    updateJurisdiction,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  };
};
