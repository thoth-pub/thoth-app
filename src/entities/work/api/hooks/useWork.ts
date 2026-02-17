'use client';

import { useCreateContribution, useDeleteContribution, useUpdateContribution } from '@/src/entities/contribution';

import type { WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import useGetWork from './useGetWork';
import { useUpdateWork } from './useUpdateWork';

const useWork = (id: WorkId) => {
  const { work, isLoading } = useGetWork(id);
  const { deleteWork } = useDeleteWork({});
  const { updateWork } = useUpdateWork({
    workId: id,
  });
  const { createContribution } = useCreateContribution();
  const { updateContribution } = useUpdateContribution({ relatedWorkId: id });
  const { deleteContribution } = useDeleteContribution();

  return {
    work,
    loading: isLoading,
    deleteWork,
    updateWork,
    updateContribution,
    createContribution,
    deleteContribution,
  };
};

export default useWork;
