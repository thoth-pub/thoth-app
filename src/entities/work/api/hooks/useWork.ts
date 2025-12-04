'use client';

import { QueryToken } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import type { WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import { useUpdateWork } from './useUpdateWork';
import useGetWork from './useGetWork';
import { useCreateContribution, useDeleteContribution, useUpdateContribution } from '@/src/entities/contribution';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

const mapper = new WorkDtoMapper();

const useWork = (
  id: WorkId,
  queryToken: QueryToken,
  onCreateContributionCompleted?: (data: WorkContribution) => void,
) => {
  const { work } = useGetWork(id);
  const { deleteWork } = useDeleteWork({ queryToken });
  const { updateWork } = useUpdateWork({
    workId: id,
    queryToken,
  });
  const { createContribution } = useCreateContribution({ queryToken, onCompleted: onCreateContributionCompleted });
  const { updateContribution } = useUpdateContribution({ queryToken, relatedWorkId: id });
  const { deleteContribution } = useDeleteContribution({ queryToken });

  return {
    work,
    deleteWork,
    updateWork,
    updateContribution,
    createContribution,
    deleteContribution,
  };
};

export default useWork;
