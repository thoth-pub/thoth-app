import { WorkContribution } from '@/src/entities/work/model/work.types';
import { ContributorTypes } from './contributors';
import { appConfig } from '../config';

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
