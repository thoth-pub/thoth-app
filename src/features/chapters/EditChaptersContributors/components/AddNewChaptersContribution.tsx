'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useContributionStateMachine, useCreateContribution } from '@/src/entities/contribution';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { useContributor, useUpdateContributor } from '@/src/entities/contributor';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { AddNewContribution } from '@/src/features/contribution';
import { QueryKeys } from '@/src/shared/constants';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

type AddNewChaptersContributionProps = BaseRecommendedSectionProps & {
  chapters: WorkEntity[];
  onCreate?: (contribution: WorkContribution) => void;
};

export const AddNewChaptersContribution = (props: AddNewChaptersContributionProps) => {
  const { recommended, chapters, onCreate } = props;

  const { activeEntity: activeContribution, close } = useContributionStateMachine();

  const queryClient = useQueryClient();

  const { createContribution } = useCreateContribution();

  const { contributor } = useContributor({ contributorId: activeContribution?.contributorId });
  const { updateContributor } = useUpdateContributor({
    onError: () => close(),
  });

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

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
      const lastOrderNumber =
        chapter.contributions.sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber ||
        chapter.contributions.length + 1;

      return createContribution({
        data: {
          ...contribution,
          isMain: true,
          orderNumber: lastOrderNumber + 1,
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

  return <AddNewContribution recommended={recommended} workId="" onCreate={createChaptersContribution} />;
};
