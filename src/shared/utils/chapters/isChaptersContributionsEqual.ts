import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { isAffiliationsEqual } from './isAffiliationsEqual';
import { isBiographiesEqual } from './isBiographiesEqual';
import { isContributorsEqual } from './isContributorsEqual';
import { isContributorsRolesEqual } from './isContributorsRolesEqual';

export const isChaptersContributionsEqual = (chapters: WorkEntity[]) => {
  const areEqualContributors = isContributorsEqual(chapters);
  const areEqualContributorsRoles = isContributorsRolesEqual(chapters);
  const areEqualAffiliations = isAffiliationsEqual(chapters);
  const areEqualBiographies = isBiographiesEqual(chapters);

  return areEqualContributors && areEqualContributorsRoles && areEqualAffiliations && areEqualBiographies;
};
