import { useQueryClient } from '@tanstack/react-query';

import { useCreateBiography, useDeleteBiography, useUpdateBiography } from '@/src/entities/contribution';
import type {
  BiographyEntity,
  ContributionBiographyForm,
  WorkContribution,
} from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import { QueryKeys } from '@/src/shared/constants';
import { computeBiographiesDiff } from '@/src/shared/utils/biographies';

import { findAllSameContributions } from '../components/utils';

export const useChaptersBiographiesUpdate = () => {
  const queryClient = useQueryClient();
  const { deleteBiography } = useDeleteBiography();
  const { createBiography } = useCreateBiography();
  const { updateBiography } = useUpdateBiography('');

  const updateChaptersBiographies = async ({
    contributionId,
    chapters,
    data,
    uniqueContributors,
  }: {
    contributionId: ContributionId;
    chapters: WorkEntity[];
    data: ContributionBiographyForm;
    uniqueContributors: WorkContribution[];
  }) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, uniqueContributors);

    if (sameContributions.length === 0) return [];

    const desiredRows = data.biographies
      .map(({ contributorBiography, language }) => ({
        content: contributorBiography ?? '',
        localeCode: language.value,
      }))
      .filter((row) => row.content.length > 0);

    const updatedContributions: WorkContribution[] = [];

    try {
      for (const contribution of sameContributions) {
        // The form rows carry the active contribution's biography ids, so resolve each
        // row against this contribution's own biographies by locale instead.
        const desiredBiographies: BiographyEntity[] = desiredRows.map((row) => ({
          id:
            contribution.biographies.find(({ localeCode }) => localeCode === row.localeCode)?.id ??
            appConfig.defaultId,
          canonical: false,
          content: row.content,
          localeCode: row.localeCode,
          contributionId: contribution.id,
        }));

        const { biographiesToDelete, updatedBiographies, unchangedBiographies, newBiographies } =
          computeBiographiesDiff(desiredBiographies, contribution.biographies);

        // Deletions only remove content the user discarded, and must run first so a
        // replacement canonical biography does not clash with the deleted one.
        await Promise.all(biographiesToDelete.map(({ id }) => deleteBiography(id)));
        await Promise.all(updatedBiographies.map((biography) => updateBiography({ data: biography })));
        const createdBiographies = await Promise.all(
          newBiographies.map((biography) => createBiography({ data: biography, contributionId: contribution.id })),
        );

        updatedContributions.push({
          ...contribution,
          biographies: [...updatedBiographies, ...unchangedBiographies, ...createdBiographies],
        });
      }
    } catch {
      // The mutation hooks surface the error notification; the remaining contributions
      // are skipped so kept biographies are never deleted. The invalidation below
      // resyncs local state with whatever was persisted.
    }

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      const updatedContribution = updatedContributions.find(({ id }) => id === contribution.id);

      return updatedContribution ?? contribution;
    });

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });

    return updatedUniqueContributions;
  };

  return {
    updateChaptersBiographies,
  };
};
