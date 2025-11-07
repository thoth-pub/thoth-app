import type { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import type { BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';

type EditChaptersContributorsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersContributors = (props: EditChaptersContributorsProps) => {
  const { queryToken, chapters } = props;

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

  return (
    <RecommendedSection title="Contributors" isEmpty={true} isValid={false}>
      {({ showRecommendations }) => <Typography>Is section enabled: {isSectionEnabled ? 'Yes' : 'No'}</Typography>}
    </RecommendedSection>
  );
};

export default EditChaptersContributors;
