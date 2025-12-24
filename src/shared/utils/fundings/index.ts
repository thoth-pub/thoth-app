import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';

export const getDefaultFunding = (data?: Partial<FundingEntity>): FundingEntity => {
  return {
    id: appConfig.defaultId,
    grantNumber: '',
    institutionId: '',
    jurisdiction: '',
    program: '',
    projectName: '',
    projectShortname: '',
    institutionName: '',
    institutionRor: '',
    ...data,
  };
};

export const isAllFundingRecommendationsFilled = (funding: FundingEntity) => {
  return funding.grantNumber.length > 0;
};

export const areFundingsEqual = (works: WorkEntity[]): boolean => {
  const uniqueInstitutionIds = [
    ...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.institutionId))),
  ];

  const uniqueGrantNumbers = [...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.grantNumber)))];

  const uniquePrograms = [...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.program)))];

  const uniqueProjectNames = [...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.projectName)))];

  const uniqueProjectShortNames = [
    ...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.projectShortname))),
  ];

  const uniqueJurisdictions = [
    ...new Set(works.flatMap((work) => work.fundings.map((funding) => funding.jurisdiction))),
  ];

  const areFundingsEqual = works.every(({ fundings }) => {
    if (
      fundings.length !== uniqueInstitutionIds.length ||
      fundings.length !== uniqueGrantNumbers.length ||
      fundings.length !== uniquePrograms.length ||
      fundings.length !== uniqueProjectNames.length ||
      fundings.length !== uniqueProjectShortNames.length ||
      fundings.length !== uniqueJurisdictions.length
    )
      return false;

    return fundings.every((funding) => {
      return (
        uniqueInstitutionIds.includes(funding.institutionId) &&
        uniqueGrantNumbers.includes(funding.grantNumber) &&
        uniquePrograms.includes(funding.program) &&
        uniqueProjectNames.includes(funding.projectName) &&
        uniqueJurisdictions.includes(funding.jurisdiction) &&
        uniqueProjectShortNames.includes(funding.projectShortname)
      );
    });
  });

  return areFundingsEqual;
};
