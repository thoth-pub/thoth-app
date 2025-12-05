import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

import { appConfig } from '../config';
import { ContributorTypes } from './contributors';

export const getDefaultContribution = (data?: Partial<WorkContribution>): WorkContribution => {
  return {
    fullName: '',
    lastName: '',
    firstName: '',
    id: appConfig.defaultId,
    contributorId: '',
    type: ContributorTypes.enum.Author,
    isMain: true,
    orderNumber: 1,
    biography: '',
    orcidId: '',
    website: '',
    affiliations: [],
    ...data,
  };
};
