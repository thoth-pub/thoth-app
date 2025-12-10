'use client';

import { useCreateContribution, useDeleteContribution, useUpdateContribution } from '@/src/entities/contribution';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

import type { WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import useGetWork from './useGetWork';
import { useUpdateWork } from './useUpdateWork';

const useWork = (id: WorkId, onCreateContributionCompleted?: (data: WorkContribution) => void) => {
  const { work } = useGetWork(id);
  const { deleteWork } = useDeleteWork({});
  const { updateWork } = useUpdateWork({
    workId: id,
  });
  const { createContribution } = useCreateContribution({ onCompleted: onCreateContributionCompleted });
  const { updateContribution } = useUpdateContribution({ relatedWorkId: id });
  const { deleteContribution } = useDeleteContribution();

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
