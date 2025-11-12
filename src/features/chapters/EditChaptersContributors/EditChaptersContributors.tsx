'use client';

import { ChaptersContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionId,
  ContributionType,
  ContributorId,
} from '@/src/entities/contributor/model/contributor.types';
import { WorkContribution, WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { isDefaultId, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';
import { useEffect, useMemo, useState } from 'react';
import AddContributionModal from '../../work/AddContributionModal/AddContributionModal';
import { AddNewChaptersContribution } from './components/AddNewChaptersContribution';
import { useWorkContributionsBulkDelete, useWorkContributionsBulkUpdate } from '@/src/entities/work';
import { EditChaptersContributions } from './components/EditChaptersContributions';
import { findAllSameContributions } from './components/utils';
import useEditContributionAffiliations from '@/src/entities/affiliation/ui/useAffiliationsForm';
import { AffiliationEntity, AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';

type EditChaptersContributorsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersContributors = (props: EditChaptersContributorsProps) => {
  const { queryToken, chapters } = props;

  const { activeContribution, edit, close } = useContributionStateMachine();

  const { deleteContributions } = useWorkContributionsBulkDelete(queryToken);
  const { updateContributions } = useWorkContributionsBulkUpdate(queryToken);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

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
            contributor.biography === contribution.biography &&
            contributor.website === contribution.website,
        );

        if (existingContributor) return;

        uniqueContributors.push(contribution);
      });
    });

    return uniqueContributors;
  }, [chapters]);

  const [contributions, setContributions] = useState(uniqueContributors);

  const isSameAffiliations = useMemo(() => {
    // 1. Map all chapters
    return chapters.every((chapter) => {
      // 2. Map all contributions
      return chapter.contributions.every((contribution) => {
        // 3. For each contribution, get the contributor id
        const contributorId = contribution.contributorId;

        // 4. For each affiliation, check if it exists in every other contribution in every other chapter
        // With the same contributor, with the same institution, order number and position
        return contribution.affiliations.every((affiliation) => {
          // 5. Map all chapters
          return chapters.every((chapter) => {
            // 6. Find same contribution
            const contribution = chapter.contributions.find(
              (contribution) => contribution.contributorId === contributorId,
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
  }, [chapters]);

  const isSectionEnabled = isContributorsRolesSame && isSameContributors && isSameAffiliations;

  const isNewContribution = activeContribution && isDefaultId(activeContribution.id);

  const affiliations = useMemo(() => {
    const contributions = chapters.flatMap((chapter) => chapter.contributions);
    const affiliations = contributions.flatMap((contribution) => contribution.affiliations);

    return affiliations;
  }, [chapters]);

  const { updateBulkAffiliations, deleteBulkAffiliations } = useEditContributionAffiliations({
    queryToken,
    contributionId: '',
    affiliations,
  });

  const handleNewContribution = (contribution: WorkContribution) => {
    setContributions((prev) => [...prev, { ...contribution, isMain: true }]);
    close();
  };

  const handleEdit = (id: ContributionId) => {
    const contribution = uniqueContributors.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  const handleBulkDelete = async (id: ContributionId) => {
    const sameContributions = findAllSameContributions(id, chapters, contributions);

    if (sameContributions.length === 0) return;

    const contributionIds = sameContributions.map((contribution) => contribution.id);

    const updatedUniqueContributors = contributions.filter((contribution) => contribution.id !== id);

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

    const updatedUniqueContributions = contributions.map((contribution) => {
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

    const contributionIds = sameContributions.map((contribution) => contribution.id);

    updateBulkAffiliations(data, contributionIds);
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
  };

  return (
    <RecommendedSection title="Contributors" isEmpty={true} isValid={false}>
      {({ showRecommendations }) => (
        <>
          {isSectionEnabled ? (
            <>
              <ChaptersContributionsTable
                contributions={contributions}
                activeContribution={activeContribution}
                onEdit={handleEdit}
                onDelete={handleBulkDelete}
                onSelectAsMain={handleMainBulkUpdate}
                onDragEnd={(id) => console.log('drag ended', id)}
                form={
                  <EditChaptersContributions
                    showRecommendations={showRecommendations}
                    queryToken={queryToken}
                    onUpdate={handleBulkUpdate}
                    onUpdateAffiliations={handleUpdateAffiliations}
                    onDeleteAffiliation={handleDeleteAffiliation}
                  />
                }
                showRecommendations={showRecommendations}
              />
              {isNewContribution && (
                <AddNewChaptersContribution
                  recommended={showRecommendations}
                  workId=""
                  queryToken={queryToken}
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
