import { AffiliationEntity } from '@/src/entities/affiliation';
import { appConfig } from '../config';

export const getDefaultAffiliation = (data?: Partial<AffiliationEntity>): AffiliationEntity => {
  return {
    id: appConfig.defaultId,
    contributionId: appConfig.defaultId,
    institutionId: '',
    institutionName: '',
    rorId: '',
    position: '',
    orderNumber: 1,
    ...data,
  };
};
