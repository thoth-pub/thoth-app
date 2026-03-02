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

const getFundingKey = ({ grantNumber, institutionId, jurisdiction, program, projectName, projectShortname }: FundingEntity) =>
  [grantNumber, institutionId, jurisdiction, program, projectName, projectShortname].join('||');

export const areFundingsEqual = (works: WorkEntity[]): boolean => {
  if (works.length === 0) return true;

  const getSortedKeys = (work: WorkEntity) =>
    work.fundings.map(getFundingKey).sort();

  const referenceKeys = getSortedKeys(works[0]);

  return works.every((work) => {
    const keys = getSortedKeys(work);
    return keys.length === referenceKeys.length && keys.every((key, i) => key === referenceKeys[i]);
  });
};
