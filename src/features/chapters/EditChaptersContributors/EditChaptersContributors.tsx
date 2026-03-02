'use client';

import { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import useEditContributionAffiliations from '@/src/entities/affiliation/ui/useAffiliationsForm';
import { ChaptersContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import type { ContributionBiographyForm, WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { type BaseEditSectionProps, isAllContributionRecommendationsFilled, isDefaultId } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';
import { isChaptersContributionsEqual } from '@/src/shared/utils/chapters';

import AddContributionModal from '../../work/AddContributionModal/AddContributionModal';
import { AddNewChaptersContribution } from './components/AddNewChaptersContribution';
import { EditChaptersContributions } from './components/EditChaptersContributions';
import { findAllSameContributions } from './components/utils';
import {
  useChaptersAffiliations,
  useChaptersAffiliationsOrderUpdate,
  useChaptersBiographiesUpdate,
  useChaptersContributionsUpdate,
  useChaptersUniqueContributors,
  useDeleteChaptersAffiliations,
  useDeleteChaptersContributions,
} from './hooks';
import { useChaptersContributionsReorder } from './hooks/useChaptersContributionsReorder';

type EditChaptersContributorsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersContributors = (props: EditChaptersContributorsProps) => {
  const { chapters } = props;

  const { activeEntity: activeContribution, edit, update, close } = useContributionStateMachine();
  const { uniqueContributors } = useChaptersUniqueContributors(chapters);
  const { affiliations } = useChaptersAffiliations(chapters);

  const { updateChaptersContributions } = useChaptersContributionsUpdate();
  const { updateBulkAffiliations } = useEditContributionAffiliations({
    contributionId: '',
    affiliations,
  });
  const { updateChaptersBiographies } = useChaptersBiographiesUpdate();
  const { deleteChaptersAffiliations } = useDeleteChaptersAffiliations({
    affiliations,
  });
  const { deleteChaptersContributions } = useDeleteChaptersContributions();
  const { updateChaptersAffiliationsOrder } = useChaptersAffiliationsOrderUpdate();
  const { reorderChaptersContributions } = useChaptersContributionsReorder();

  const isContributionsEqual = isChaptersContributionsEqual(chapters);

  const isEmpty = uniqueContributors.length === 0;
  const isValid = isEmpty || uniqueContributors.every(isAllContributionRecommendationsFilled);
  const isSectionEnabled = isContributionsEqual;
  const isNewContribution = activeContribution ? isDefaultId(activeContribution.id) : false;

  const handleNewContribution = () => {
    close();
  };

  const handleEdit = (id: ContributionId) => {
    const contribution = uniqueContributors.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  const handleBulkDelete = async (id: ContributionId) => {
    await deleteChaptersContributions({
      id,
      chapters,
      uniqueContributors,
    });
  };

  const handleBulkUpdate = async (id: ContributionId, updatedData?: Partial<WorkContribution>) => {
    updateChaptersContributions({
      id,
      chapters,
      uniqueContributors,
      updatedData,
    });
  };

  const handleMainBulkUpdate = async (id: ContributionId) => {
    const sameContributions = findAllSameContributions(id, chapters, uniqueContributors);

    if (sameContributions.length === 0) return;

    await handleBulkUpdate(id, { isMain: !sameContributions[0].isMain });
  };

  const handleUpdateAffiliations = (data: AffiliationsForm, contributionId: ContributionId) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, uniqueContributors);

    if (sameContributions.length === 0) return;

    const contributionsIds = sameContributions.map((contributions) => contributions.id);

    updateBulkAffiliations(data, contributionsIds);
    close();
  };

  const handleDeleteAffiliation = async (id: string, contributionId: ContributionId) => {
    const { deletedIds } = await deleteChaptersAffiliations({
      id,
      contributionId,
      chapters,
      affiliations,
      uniqueContributors,
    });

    if (!activeContribution) return;

    const updatedActiveContribution = {
      ...activeContribution,
      affiliations: activeContribution.affiliations.filter((affiliation) => !deletedIds.includes(affiliation.id)),
    };

    update(updatedActiveContribution);
  };

  const handleDragEnd = async (data: WorkContribution[]) => {
    await reorderChaptersContributions({ data, chapters, uniqueContributors });
  };

  const handleAffiliationOrderUpdate = async (data: AffiliationsForm['affiliations']) => {
    const updatedUniqueContributions = await updateChaptersAffiliationsOrder({
      data,
      chapters,
      uniqueContributors,
    });

    const updatedActiveContribution = updatedUniqueContributions.find(
      (contribution) => contribution.id === activeContribution?.id,
    );

    if (!updatedActiveContribution) return;

    update(updatedActiveContribution);
  };

  const handleBiographiesUpdate = async (data: ContributionBiographyForm, contributionId: ContributionId) => {
    const updatedUniqueContributions = await updateChaptersBiographies({
      contributionId,
      chapters,
      data,
      uniqueContributors,
    });

    const updatedActiveContribution = updatedUniqueContributions.find(
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
