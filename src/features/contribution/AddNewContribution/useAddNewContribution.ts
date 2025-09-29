'use client';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

type UseAddNewContributionProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useAddNewContribution = (props: UseAddNewContributionProps) => {
  const { workId, queryToken } = props;

  const { activeContribution, close } = useContributionStateMachine();
  const { work, createContribution, deleteContribution, contributionToDto, updateWorkContributionRef } = useWork(
    workId,
    queryToken,
  );

  return {
    activeContribution,
    close,
  };
};
