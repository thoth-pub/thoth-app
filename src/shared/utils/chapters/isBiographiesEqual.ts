import { WorkEntity } from '@/src/entities/work/model/work.types';

export const isBiographiesEqual = (chapters: WorkEntity[]) => {
  // 1. Map all chapters
  return chapters.every((chapter) => {
    // 2. Map all contributions
    return chapter.contributions.every((contribution) => {
      // 3. For each contribution, get the contributor id
      const contributorId = contribution.contributorId;
      const contributionType = contribution.type;

      // 4. For each biography, check if it exists in every other contribution in every other chapter
      return contribution.biographies.every((biography) => {
        // 5. Map all chapters
        return chapters.every((chapter) => {
          // 6. Find same contribution
          const contribution = chapter.contributions.find(
            (contribution) => contribution.contributorId === contributorId && contribution.type === contributionType,
          );

          if (!contribution) return false;

          // 7. Check if the biography exists in the other contribution with the same contributor,
          // with the same content and locale code
          return contribution.biographies.some((contributionBiography) => {
            return (
              biography.content === contributionBiography.content &&
              biography.localeCode === contributionBiography.localeCode
            );
          });
        });
      });
    });
  });
};
