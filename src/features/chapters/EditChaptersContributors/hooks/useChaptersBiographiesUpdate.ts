import { useQueryClient } from '@tanstack/react-query';

import { useCreateBiography, useDeleteBiography } from '@/src/entities/contribution';
import type { ContributionBiographyForm, WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { appConfig, QueryKeys } from '@/src/shared';

import { findAllSameContributions } from '../components/utils';

export const useChaptersBiographiesUpdate = () => {
  const queryClient = useQueryClient();
  const { deleteBiography } = useDeleteBiography();
  const { createBiography } = useCreateBiography();

  const updateChaptersBiographies = async ({
    contributionId,
    chapters,
    contributions,
    data,
    uniqueContributors,
  }: {
    contributionId: ContributionId;
    chapters: WorkEntity[];
    contributions: WorkContribution[];
    data: ContributionBiographyForm;
    uniqueContributors: WorkContribution[];
  }) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, contributions);
    const contributionsToUpdateIds = sameContributions.map((contribution) => contribution.id);
    const updatedContributions: WorkContribution[] = [];

    if (sameContributions.length === 0) return [];

    const existingBiographies = sameContributions.flatMap((contribution) => contribution.biographies);

    const deletePromises = existingBiographies.map((biography) => deleteBiography(biography.id));

    await Promise.all(deletePromises);

    const contributionsIds = sameContributions.map((contribution) => contribution.id);

    const biographiesToCreate = data.biographies
      .map((biography, index) => ({
        id: appConfig.defaultId,
        canonical: index === 0,
        content: biography.contributorBiography ?? '',
        localeCode: biography.language.value,
        contributionId: contributionId,
      }))
      .filter((biography) => biography.content.length > 0);

    for (contributionId of contributionsIds) {
      const updatedBiographies = await Promise.all(
        biographiesToCreate.map((biography) =>
          createBiography({
            data: biography,
            contributionId,
          }),
        ),
      );

      const contributionToUpdate = uniqueContributors.find((contribution) => contribution.id === contributionId);

      if (!contributionToUpdate) continue;

      updatedContributions.push({
        ...contributionToUpdate,
        biographies: updatedBiographies,
      });
    }

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (!contributionsToUpdateIds.includes(contribution.id)) return contribution;

      const foundedContribution = updatedContributions.find(
        (updatedContribution) => updatedContribution.id === contribution.id,
      );

      if (!foundedContribution) return contribution;

      return {
        ...contribution,
        biographies: foundedContribution.biographies,
      };
    });

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });

    return updatedUniqueContributions;
  };

  return {
    updateChaptersBiographies,
  };
};
