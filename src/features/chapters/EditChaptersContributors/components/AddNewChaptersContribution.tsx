import { useCreateAffiliation } from '@/src/entities/affiliation';
import { useContributionStateMachine } from '@/src/entities/contribution';
import { useContributor, useCreateContributor, useUpdateContributor } from '@/src/entities/contributor';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkEntity } from '@/src/entities/work/model/work.types';
import { AddNewContribution } from '@/src/features/contribution';
import { isDefaultId, type BaseRecommendedSectionProps } from '@/src/shared';
import { useEffect } from 'react';

type AddNewChaptersContributionProps = BaseRecommendedSectionProps & {
  chapters: WorkEntity[];
  onCreate?: (contribution: WorkContribution) => void;
};

export const AddNewChaptersContribution = (props: AddNewChaptersContributionProps) => {
  const { recommended, queryToken, chapters, onCreate } = props;

  const { activeContribution, close } = useContributionStateMachine();

  const { createAffiliation } = useCreateAffiliation({
    queryToken,
    workId: '',
  });

  const { createContribution } = useWork('', queryToken, (data) => {
    if (!activeContribution) return;

    activeContribution.affiliations.forEach(async ({ institutionId, position }, index) => {
      await createAffiliation({
        variables: {
          data: {
            contributionId: data.contributionId,
            institutionId,
            affiliationOrdinal: 1 + index,
            position: position && position.length > 0 ? position : null,
          },
        },
      });
    });
  });

  const { createContributor } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      if (!activeContribution || chapters.length === 0) return;

      chapters.forEach((chapter) => {
        createContribution(
          {
            ...activeContribution,
            isMain: true,
            orderNumber: chapter.contributions.length + 1,
            contributorId: data.contributorId,
          },
          chapter.id,
        );
      });
    },
    onError: () => close(),
  });

  const { contributor } = useContributor({ contributorId: activeContribution?.contributorId });

  const { updateContributor } = useUpdateContributor({
    queryToken,
    workId: '',
    contributorId: '',
    onError: () => close(),
  });

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  const createWithNewContributor = (contribution: WorkContribution) => {
    createContributor({
      fullName: contribution.fullName,
      lastName: contribution.lastName,
      firstName: contribution.firstName,
      orcid: contribution.orcidId,
      website: contribution.website,
    });
  };

  const createWithExistingContributor = (contribution: WorkContribution) => {
    if (!activeContribution) return;

    const isOrchidEdit = activeContribution.orcidId && activeContribution.orcidId !== '';
    const isWebsiteEdit = activeContribution.website && activeContribution.website !== '';

    if ((isOrchidEdit || isWebsiteEdit) && contributor) {
      updateContributor({
        firstName: contributor.firstName,
        lastName: contributor.lastName,
        fullName: contributor.fullName,
        orcid: activeContribution.orcidId,
        website: activeContribution.website,
        id: contributor.id,
      });
    }

    chapters.forEach((chapter) => {
      createContribution(
        {
          ...activeContribution,
          isMain: true,
          orderNumber: chapter.contributions.length + 1,
        },
        chapter.id,
      );
    });
  };

  const createChaptersContribution = (contribution: WorkContribution) => {
    const isNewContributor = isDefaultId(contribution.contributorId);

    if (isNewContributor) {
      createWithNewContributor(contribution);
      close();
      onCreate?.(contribution);
      return;
    }

    createWithExistingContributor(contribution);
    close();
    onCreate?.(contribution);
  };

  return (
    <AddNewContribution
      recommended={recommended}
      workId=""
      queryToken={queryToken}
      onCreate={createChaptersContribution}
    />
  );
};
