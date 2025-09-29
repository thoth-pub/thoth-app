'use client';

import { useMemo, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useLinkedPublishers } from '@/src/entities/contributor';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

type UseEditContributionProps = {
  workId: WorkId;
  queryToken: QueryToken;
  isAdmin?: boolean;
  linkedPublishers?: PublisherId[];
};

export const useEditContribution = (props: UseEditContributionProps) => {
  const { workId, queryToken, isAdmin = false, linkedPublishers = [] } = props;

  const { activeContribution, close } = useContributionStateMachine();
  const [contribution, setContribution] = useState<WorkContribution | null>(activeContribution);

  const { work, createContribution, deleteContribution, contributionToDto, updateWorkContributionRef } = useWork(
    workId,
    queryToken,
  );
  const { contributedToPublishers } = useLinkedPublishers({ id: activeContribution?.contributorId });

  const isContributedOnlyToCurrentPublisher = useMemo(() => {
    const contributions = Array.from(new Set(contributedToPublishers));

    return contributions.every((contribution) => linkedPublishers.includes(contribution));
  }, [contributedToPublishers, workId]);

  const isOrchidEditionDisabled = !!activeContribution?.orcidId && !isAdmin && !isContributedOnlyToCurrentPublisher;
  const isWebsiteUrlEditionDisabled = !!activeContribution?.website && !isAdmin && !isContributedOnlyToCurrentPublisher;

  const updateContribution = (data: WorkContribution) => {
    setContribution(data);
    updateWorkContributionRef(data);
  };

  return {
    contribution,
    isOrchidEditionDisabled,
    isWebsiteUrlEditionDisabled,
    close,
    update: updateContribution,
  };
};
