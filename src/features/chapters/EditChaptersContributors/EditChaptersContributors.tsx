'use client';

import { ChaptersContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import type { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { WorkContribution, WorkEntity } from '@/src/entities/work/model/work.types';
import { isDefaultId, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';
import { useMemo, useState } from 'react';
import AddContributionModal from '../../work/AddContributionModal/AddContributionModal';
import { AddNewChaptersContribution } from './components/AddNewChaptersContribution';

type EditChaptersContributorsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersContributors = (props: EditChaptersContributorsProps) => {
  const { queryToken, chapters } = props;

  const { activeContribution } = useContributionStateMachine();

  const contributorsIds = chapters.flatMap((chapter) =>
    chapter.contributions.map((contribution) => contribution.contributorId),
  );

  const contributorsRoles: Record<ContributorId, ContributionType[]> = {};

  chapters.forEach((chapter) => {
    chapter.contributions.forEach((contribution) => {
      const existingRoles = contributorsRoles[contribution.contributorId];

      if (existingRoles && !existingRoles.includes(contribution.type)) {
        existingRoles.push(contribution.type);
        return;
      }

      contributorsRoles[contribution.contributorId] = [contribution.type];
    });
  });

  const uniqueContributorsIds = [...new Set(contributorsIds)];

  const isContributorsRolesSame = Object.values(contributorsRoles).every((roles) => roles.length === 1);

  const isSameContributors = chapters.every((chapter) => {
    const chapterContributorsIds = chapter.contributions.map((contribution) => contribution.contributorId);

    return uniqueContributorsIds.every((contributorId) => chapterContributorsIds.includes(contributorId));
  });

  const isSectionEnabled = isContributorsRolesSame && isSameContributors;

  const isNewContribution = activeContribution && isDefaultId(activeContribution.id);

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

  const handleNewContribution = (contribution: WorkContribution) => {
    setContributions((prev) => [...prev, { ...contribution, isMain: true }]);
    close();
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
                onEdit={(id) => console.log('select as main', id)}
                onDelete={(id) => console.log('select as main', id)}
                onSelectAsMain={(id) => console.log('select as main', id)}
                onDragEnd={(id) => console.log('select as main', id)}
                form={<>form</>}
                showRecommendations={false}
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
