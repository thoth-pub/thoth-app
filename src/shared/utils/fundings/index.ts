import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
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
