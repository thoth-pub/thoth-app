import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

import { appConfig } from '../config';
import { ContributorTypes } from './contributors';

export const getDefaultContribution = (data?: Partial<WorkContribution>): WorkContribution => {
  return {
    fullName: 'Full Name',
    lastName: 'Last Name',
    firstName: '',
    id: appConfig.defaultId,
    contributorId: appConfig.defaultId,
    type: ContributorTypes.enum.Author,
    isMain: true,
    orderNumber: 1,
    biographies: [],
    orcidId: '',
    website: '',
    affiliations: [],
    ...data,
  };
};
