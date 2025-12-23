'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useMoveBulkAffiliation } from '@/src/entities/affiliation';
import { AffiliationEntity, AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import useEditContributionAffiliations from '@/src/entities/affiliation/ui/useAffiliationsForm';
import {
  ChaptersContributionsTable,
  useContributionStateMachine,
  useCreateBiography,
  useDeleteBiography,
  useMoveContribution,
} from '@/src/entities/contribution';
import useContributionsBulkDelete from '@/src/entities/contribution/api/hooks/useContributionsBulkDelete';
import useContributionsBulkUpdate from '@/src/entities/contribution/api/hooks/useContributionsBulkUpdate';
import type { ContributionBiographyForm, WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type {
  ContributionId,
  ContributionType,
  ContributorId,
} from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import {
  appConfig,
  type BaseEditSectionProps,
  isAllContributionRecommendationsFilled,
  isDefaultId,
  QueryKeys,
} from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';

import AddContributionModal from '../../work/AddContributionModal/AddContributionModal';
import { AddNewChaptersContribution } from './components/AddNewChaptersContribution';
import { EditChaptersContributions } from './components/EditChaptersContributions';
import { findAllSameContributions } from './components/utils';

type EditChaptersContributorsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

// TODO: ref
const EditChaptersContributors = (props: EditChaptersContributorsProps) => {
  const { chapters } = props;

  const { activeContribution, edit, update, close } = useContributionStateMachine();

  const queryClient = useQueryClient();
  const { deleteContributions } = useContributionsBulkDelete();
  const { deleteBiography } = useDeleteBiography();
  const { createBiography } = useCreateBiography();
  const { updateContributions } = useContributionsBulkUpdate();
  const { moveContribution } = useMoveContribution({ workId: '' });
  const { moveBulkAffiliation } = useMoveBulkAffiliation();

  const contributorsIds = chapters.flatMap((chapter) =>
    chapter.contributions.map((contribution) => contribution.contributorId),
  );

  const contributorsRoles: Record<ContributorId, ContributionType[]> = {};

  const uniqueContributorsIds = [...new Set(contributorsIds)];

  const isContributorsRolesSame = Object.values(contributorsRoles).every((roles) => roles.length === 1);

  const isSameContributors = chapters.every((chapter) => {
    const chapterContributorsIds = chapter.contributions.map((contribution) => contribution.contributorId);

    const isIdsSame = uniqueContributorsIds.every((contributorId) => chapterContributorsIds.includes(contributorId));

    return isIdsSame;
  });

  const affiliations = useMemo(() => {
    const contributions = chapters.flatMap((chapter) => chapter.contributions);
    const affiliations = contributions.flatMap((contribution) => contribution.affiliations);

    return affiliations;
  }, [chapters]);

  const uniqueContributors = useMemo(() => {
    const uniqueContributors: WorkContribution[] = [];

    chapters.forEach(({ contributions }) => {
      contributions.forEach((contribution) => {
        const existingContributor = uniqueContributors.find(
          (contributor) =>
            contributor.contributorId === contribution.contributorId &&
            contributor.fullName === contribution.fullName &&
            contributor.lastName === contribution.lastName &&
            contributor.firstName === contribution.firstName &&
            contributor.type === contribution.type &&
            contributor.isMain === contribution.isMain &&
            contributor.website === contribution.website &&
            contributor.biographies.every((biography) =>
              contribution.biographies.some(
                (contributionBiography) =>
                  contributionBiography.content === biography.content &&
                  contributionBiography.localeCode === biography.localeCode,
              ),
            ),
        );

        if (existingContributor) return;

        uniqueContributors.push(contribution);
      });
    });

    return uniqueContributors;
  }, [chapters]);

  const [contributions, setContributions] = useState(uniqueContributors);

  const isEmpty = uniqueContributors.length === 0;
  const isValid = isEmpty || uniqueContributors.every(isAllContributionRecommendationsFilled);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContributions(uniqueContributors);
  }, [uniqueContributors, affiliations]);

  const isSameAffiliations = useMemo(() => {
    // 1. Map all chapters
    return chapters.every((chapter) => {
      // 2. Map all contributions
      return chapter.contributions.every((contribution) => {
        // 3. For each contribution, get the contributor id
        const contributorId = contribution.contributorId;
        const contributionType = contribution.type;

        // 4. For each affiliation, check if it exists in every other contribution in every other chapter
        // With the same contributor, with the same institution, order number and position
        const isSameAffiliations = contribution.affiliations.every((affiliation) => {
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

        // 8. For each biography, check if it exists in every other contribution in every other chapter
        const isSameBiographies = contribution.biographies.every((biography) => {
          // 9. Map all chapters
          return chapters.every((chapter) => {
            // 10. Find same contribution
            const contribution = chapter.contributions.find(
              (contribution) => contribution.contributorId === contributorId && contribution.type === contributionType,
            );
            console.log('chapters', chapter);
            if (!contribution) return false;

            // 11. Check if the biography exists in the other contribution with the same contributor,
            // with the same content and locale code
            return contribution.biographies.some((contributionBiography) => {
              return (
                biography.content === contributionBiography.content &&
                biography.localeCode === contributionBiography.localeCode
              );
            });
          });
        });

        return isSameAffiliations && isSameBiographies;
      });
    });
  }, [chapters]);

  const isSectionEnabled = isContributorsRolesSame && isSameContributors && isSameAffiliations;

  const isNewContribution = activeContribution ? isDefaultId(activeContribution.id) : false;

  const { updateBulkAffiliations, deleteBulkAffiliations } = useEditContributionAffiliations({
    contributionId: '',
    affiliations,
  });

  const handleNewContribution = () => {
    close();
  };

  const handleEdit = (id: ContributionId) => {
    const contribution = uniqueContributors.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  const handleBulkDelete = async (id: ContributionId) => {
    const sameContributions = findAllSameContributions(id, chapters, uniqueContributors);

    if (sameContributions.length === 0) return;

    const contributionIds = sameContributions.map((contribution) => contribution.id);

    const updatedUniqueContributors = uniqueContributors.filter((contribution) => contribution.id !== id);

    setContributions(updatedUniqueContributors);

    await deleteContributions(contributionIds);
  };

  const handleBulkUpdate = async (id: ContributionId, updatedData?: Partial<WorkContribution>) => {
    const sameContributions = findAllSameContributions(id, chapters, contributions);

    const ids = sameContributions.map((contribution) => contribution.id);

    if (sameContributions.length === 0) return;

    const updatedContributions: { id: WorkId; contribution: WorkContribution }[] = [];

    chapters.forEach(({ contributions, id }) => {
      const chapterContributions = contributions.filter((contribution) => ids.includes(contribution.id));

      if (chapterContributions.length === 0) return;

      chapterContributions.forEach((contribution) => {
        updatedContributions.push({
          id,
          contribution: { ...contribution, ...updatedData },
        });
      });
    });

    if (updatedContributions.length === 0) return;

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (contribution.id !== id) return contribution;

      return { ...contribution, ...updatedData };
    });

    setContributions(updatedUniqueContributions);

    await updateContributions(updatedContributions);
  };

  const handleMainBulkUpdate = async (id: ContributionId) => {
    const sameContributions = findAllSameContributions(id, chapters, contributions);

    if (sameContributions.length === 0) return;

    await handleBulkUpdate(id, { isMain: !sameContributions[0].isMain });
  };

  const handleUpdateAffiliations = (data: AffiliationsForm, contributionId: ContributionId) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, contributions);

    if (sameContributions.length === 0) return;

    const contributionsIds = sameContributions.map((contributions) => contributions.id);

    updateBulkAffiliations(data, contributionsIds);
    close();
  };

  const handleDeleteAffiliation = (id: string, contributionId: ContributionId) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, contributions);

    if (sameContributions.length === 0) return;

    const relatedAffiliation = affiliations.find((affiliation) => affiliation.id === id);

    if (!relatedAffiliation) return;

    const affiliationsToDelete = sameContributions
      .map((contribution) =>
        contribution.affiliations.find(
          (affiliation) =>
            affiliation.institutionId === relatedAffiliation.institutionId &&
            affiliation.orderNumber === relatedAffiliation.orderNumber &&
            affiliation.position === relatedAffiliation.position,
        ),
      )
      .filter((affiliation) => affiliation !== undefined);

    const ids = affiliationsToDelete.map((affiliation) => affiliation.id);

    if (ids.length === 0) return;

    deleteBulkAffiliations(ids);

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (!ids.includes(contribution.id)) return contribution;

      return {
        ...contribution,
        affiliations: contribution.affiliations.filter((affiliation) => !ids.includes(affiliation.id)),
      };
    });

    setContributions(updatedUniqueContributions);

    if (!activeContribution) return;

    const updatedActiveContribution = {
      ...activeContribution,
      affiliations: activeContribution.affiliations.filter((affiliation) => !ids.includes(affiliation.id)),
    };

    update(updatedActiveContribution);
  };

  const handleDragEnd = async (data: WorkContribution[]) => {
    const reorderedContributions = data.map((contribution, index) => ({
      ...contribution,
      orderNumber: index + 1,
    }));

    const firstChangedContribution = reorderedContributions.find(
      (contribution, index) => contribution.id !== uniqueContributors[index].id,
    );

    if (!firstChangedContribution) return;

    const dateForUpdate = chapters
      .map((chapter) => {
        return chapter.contributions.find(
          (contribution) =>
            contribution.type === firstChangedContribution.type &&
            contribution.contributorId === firstChangedContribution.contributorId,
        );
      })
      .filter((contribution) => !!contribution);

    const promises = dateForUpdate.map((contribution) => {
      return moveContribution({
        contributionId: contribution.id,
        newOrdinal: firstChangedContribution.orderNumber,
      });
    });

    await Promise.all(promises);
  };

  const handleAffiliationOrderUpdate = async (data: AffiliationsForm['affiliations']) => {
    const changedAffiliations = data.map((affiliation, index) => ({
      ...affiliation,
      newOrdinal: index + 1,
    }));

    const affiliationsIds = changedAffiliations.map((affiliation) => affiliation.affiliationId);

    const chapterWithAffiliations = chapters.find((chapter) => {
      const contributions = chapter.contributions;
      const contributionsWithAffiliations = contributions.filter((contribution) =>
        contribution.affiliations.every((affiliation) => affiliationsIds.includes(affiliation.id)),
      );

      return contributionsWithAffiliations.length === changedAffiliations.length;
    });

    if (!chapterWithAffiliations) return;

    const existingContribution = chapterWithAffiliations.contributions.find(
      (contribution) =>
        contribution.affiliations.every((affiliation) => affiliationsIds.includes(affiliation.id)) &&
        contribution.affiliations.length === changedAffiliations.length,
    );

    if (!existingContribution) return;

    const firstUpdatedAffiliation = changedAffiliations.find(
      (affiliation, index) =>
        affiliation.position !== existingContribution.affiliations[index].position ||
        affiliation.affiliation?.value !== existingContribution.affiliations[index].institutionId,
    );

    if (!firstUpdatedAffiliation) return;

    const contributionsToUpdate = findAllSameContributions(existingContribution.id, chapters, contributions);
    const contributionsToUpdateIds = contributionsToUpdate.map((contribution) => contribution.id);

    const affiliationsToUpdate: AffiliationEntity[] = [];

    contributionsToUpdate.forEach((contribution) => {
      const foundedAffiliation = contribution.affiliations.find(
        (affiliation) =>
          affiliation.position === firstUpdatedAffiliation.position &&
          affiliation.institutionId === firstUpdatedAffiliation.affiliation?.value,
      );

      if (!foundedAffiliation) return;

      affiliationsToUpdate.push(foundedAffiliation);
    });

    const dataForUpdate = affiliationsToUpdate.map((affiliation) => {
      return {
        affiliationId: affiliation.id,
        newOrdinal: firstUpdatedAffiliation.newOrdinal,
      };
    });

    await moveBulkAffiliation(dataForUpdate);

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (!contributionsToUpdateIds.includes(contribution.id)) return contribution;

      const affiliations: AffiliationEntity[] = changedAffiliations.map((affiliation) => {
        return {
          id: affiliation.affiliationId,
          institutionId: affiliation.affiliation?.value,
          institutionName: affiliation.affiliation?.label,
          rorId: affiliation.affiliation?.value,
          contributionId: contribution.id,
          orderNumber: affiliation.newOrdinal,
          position: affiliation.position || '',
        };
      });

      return {
        ...contribution,
        affiliations,
      };
    });

    const updatedActiveContribution = updatedUniqueContributions.find(
      (contribution) => contribution.id === activeContribution?.id,
    );

    if (!updatedActiveContribution) return;

    update(updatedActiveContribution);

    setContributions(updatedUniqueContributions);
  };

  const handleBiographiesUpdate = async (data: ContributionBiographyForm, contributionId: ContributionId) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, contributions);
    const contributionsToUpdateIds = sameContributions.map((contribution) => contribution.id);
    const updatedContributions: WorkContribution[] = [];

    // TODO: retest after backend fix
    if (sameContributions.length === 0) return;

    const existingBiographies = sameContributions.flatMap((contribution) => contribution.biographies);

    const deletePromises = existingBiographies.map((biography) => deleteBiography(biography.id));

    await Promise.all(deletePromises);

    const contributionsIds = sameContributions.map((contribution) => contribution.id);

    for (contributionId of contributionsIds) {
      const updatedBiographies = await Promise.all(
        data.biographies.map((biography, index) =>
          createBiography({
            data: {
              id: appConfig.defaultId,
              canonical: index === 0,
              content: biography.contributorBiography ?? '',
              localeCode: biography.language.value,
              contributionId: contributionId,
            },
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

    setContributions(updatedUniqueContributions);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });

    const updatedActiveContribution = updatedContributions.find(
      (contribution) => contribution.id === activeContribution?.id,
    );

    if (!updatedActiveContribution) return;

    update(updatedActiveContribution);
  };

  return (
    <RecommendedSection title="Contributors" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          {isSectionEnabled ? (
            <>
              <ChaptersContributionsTable
                contributions={uniqueContributors}
                activeContribution={activeContribution}
                onEdit={handleEdit}
                onDelete={handleBulkDelete}
                onSelectAsMain={handleMainBulkUpdate}
                onDragEnd={handleDragEnd}
                form={
                  <EditChaptersContributions
                    showRecommendations={showRecommendations}
                    onUpdate={handleBulkUpdate}
                    onUpdateAffiliations={handleUpdateAffiliations}
                    onDeleteAffiliation={handleDeleteAffiliation}
                    onAffiliationOrderUpdate={handleAffiliationOrderUpdate}
                    onBiographiesUpdate={handleBiographiesUpdate}
                  />
                }
                showRecommendations={showRecommendations}
              />
              {isNewContribution && (
                <AddNewChaptersContribution
                  recommended={showRecommendations}
                  workId=""
                  chapters={chapters}
                  onCreate={handleNewContribution}
                />
              )}
              <AddContributionModal />
            </>
          ) : (
            <Typography className="pl-4">
              This section is unavailable because the contributors in selected chapters are not the same. Please check
              the contributors and try again.
            </Typography>
          )}
        </>
      )}
    </RecommendedSection>
  );
};

export default EditChaptersContributors;
