import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const isAffiliationsEqual = (chapters: WorkEntity[]) => {
  // 1. Map all chapters
  return chapters.every((chapter) => {
    // 2. Map all contributions
    return chapter.contributions.every((contribution) => {
      // 3. For each contribution, get the contributor id
      const contributorId = contribution.contributorId;
      const contributionType = contribution.type;

      // 4. For each affiliation, check if it exists in every other contribution in every other chapter
      // With the same contributor, with the same institution, order number and position
      return contribution.affiliations.every((affiliation) => {
        // 5. Map all chapters
        return chapters.every((chapter) => {
          // 6. Find same contribution
          const contribution = chapter.contributions.find(
            (contribution) => contribution.contributorId === contributorId && contribution.type === contributionType,
          );

          if (!contribution) return false;

          // 7. Check if the affiliation exists in the other contribution with the same contributor,
          // with the same institution, order number and position
          return contribution.affiliations.some(
            (contributionAffiliation) =>
              affiliation.institutionId === contributionAffiliation.institutionId &&
              affiliation.orderNumber === contributionAffiliation.orderNumber &&
              affiliation.position === contributionAffiliation.position,
          );
        });
      });
    });
  });
};
