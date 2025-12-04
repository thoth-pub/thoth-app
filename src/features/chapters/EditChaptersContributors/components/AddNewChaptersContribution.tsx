'use client';

import { useContributionStateMachine, useCreateContribution } from '@/src/entities/contribution';
import { useContributor, useUpdateContributor } from '@/src/entities/contributor';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { AddNewContribution } from '@/src/features/contribution';
import { type BaseRecommendedSectionProps } from '@/src/shared';
import { useEffect } from 'react';
import { QueryKeys } from '@/src/shared';
import { useQueryClient } from '@tanstack/react-query';

type AddNewChaptersContributionProps = BaseRecommendedSectionProps & {
  chapters: WorkEntity[];
  onCreate?: (contribution: WorkContribution) => void;
};

export const AddNewChaptersContribution = (props: AddNewChaptersContributionProps) => {
  const { recommended, queryToken, chapters, onCreate } = props;

  const { activeContribution, close } = useContributionStateMachine();

  const queryClient = useQueryClient();

  const { createContribution } = useCreateContribution({
    queryToken,
  });

  const { contributor } = useContributor({ contributorId: activeContribution?.contributorId });
  const { updateContributor } = useUpdateContributor({
    queryToken,
    onError: () => close(),
  });

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  const createChaptersContribution = async (contribution: WorkContribution) => {
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
        name: contributor.fullName,
        updatedAt: '',
        lastContributionTitle: '',
      });
    }

    const promises = chapters.map(async (chapter) => {
      return createContribution({
        data: {
          ...contribution,
          isMain: true,
          orderNumber: chapter.contributions.length + 1,
        },
        relatedWorkId: chapter.id,
      });
    });

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });

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
