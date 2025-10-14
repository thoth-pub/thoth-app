'use client';

import { useFundingsStateMachine, useUpdateFunding } from '@/src/entities/funding';
import type {
  FundingGrantNumberFormType,
  FundingJurisdictionFormType,
  FundingProgramFormType,
  FundingProjectNameFormType,
  FundingProjectShortNameFormType,
} from '@/src/entities/funding/model/funding.type';
import { InstitutionFormType } from '@/src/entities/institution/model/institution.types';
import { type BaseEditSectionProps } from '@/src/shared';

export const useEditFunding = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activeFunding, close } = useFundingsStateMachine();
  const { updateFunding } = useUpdateFunding({ workId, queryToken });

  const updateProject = ({ projectName }: FundingProjectNameFormType) => {
    if (!activeFunding || !projectName) return;

    updateFunding({ ...activeFunding, projectName });
  };

  const updateProjectShortName = ({ projectShortname }: FundingProjectShortNameFormType) => {
    if (!activeFunding || !projectShortname) return;

    updateFunding({ ...activeFunding, projectShortname });
  };

  const updateJurisdiction = ({ jurisdiction }: FundingJurisdictionFormType) => {
    if (!activeFunding || !jurisdiction) return;

    updateFunding({ ...activeFunding, jurisdiction });
  };

  const updateProgram = ({ program }: FundingProgramFormType) => {
    if (!activeFunding || !program) return;

    updateFunding({ ...activeFunding, program });
  };

  const updateGrantNumber = ({ grantNumber }: FundingGrantNumberFormType) => {
    if (!activeFunding || !grantNumber) return;

    updateFunding({ ...activeFunding, grantNumber });
  };

  const updateInstitution = (data: InstitutionFormType) => {
    if (!activeFunding) return;

    updateFunding({ ...activeFunding, institutionId: data.institution.value });
  };

  return {
    activeFunding,
    close,
    updateProject,
    updateProjectShortName,
    updateJurisdiction,
    updateProgram,
    updateGrantNumber,
    updateInstitution,
  };
};
