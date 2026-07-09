import type { BiographyEntity } from '@/src/entities/contribution/model/contribution.types';

import { isDefaultId } from '../helpers/isDefaultId';

type BiographiesDiff = {
  biographiesToDelete: BiographyEntity[];
  updatedBiographies: BiographyEntity[];
  unchangedBiographies: BiographyEntity[];
  newBiographies: BiographyEntity[];
};

/**
 * Diffs the biographies submitted from the form against the persisted ones so that only
 * the necessary create/update/delete mutations are sent, instead of recreating
 * everything from scratch.
 *
 * One canonical biography is allowed per contribution. The existing canonical one keeps
 * its flag if it survives the save; otherwise the first submitted biography is
 * designated, which also repairs contributions left without a canonical biography.
 * Deletions must be executed before updates and creations so a replacement canonical
 * biography does not clash with the deleted one.
 */
export const computeBiographiesDiff = (
  desiredBiographies: BiographyEntity[],
  existingBiographies: BiographyEntity[],
): BiographiesDiff => {
  const desiredIds = desiredBiographies.map(({ id }) => id);
  const biographiesToDelete = existingBiographies.filter(({ id }) => !desiredIds.includes(id));

  const isCanonicalKept = existingBiographies.some(
    (biography) => biography.canonical && desiredIds.includes(biography.id),
  );
  const canonicalDesignate = isCanonicalKept ? undefined : desiredBiographies[0];

  const submittedBiographies = desiredBiographies.map((biography) => {
    const existingBiography = existingBiographies.find(({ id }) => id === biography.id);

    return {
      ...biography,
      canonical: biography === canonicalDesignate || (existingBiography?.canonical ?? false),
    };
  });

  const newBiographies = submittedBiographies.filter(({ id }) => isDefaultId(id));
  const unchangedBiographies: BiographyEntity[] = [];
  const updatedBiographies = submittedBiographies.filter((biography) => {
    if (isDefaultId(biography.id)) return false;

    const existingBiography = existingBiographies.find(({ id }) => id === biography.id);

    if (!existingBiography) return true;

    const isUpdated =
      existingBiography.content !== biography.content ||
      existingBiography.localeCode !== biography.localeCode ||
      existingBiography.canonical !== biography.canonical;

    if (!isUpdated) {
      unchangedBiographies.push(biography);
    }

    return isUpdated;
  });

  return { biographiesToDelete, updatedBiographies, unchangedBiographies, newBiographies };
};
