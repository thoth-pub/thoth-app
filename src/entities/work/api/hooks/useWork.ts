'use client';

import { useSuspenseQuery } from '@apollo/client/react';

import { getDefaultWork, isDefaultId, QueryToken } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORK } from '../../model/work.schema';
import type { WorkContribution, WorkContributionDto, WorkDto, WorkEntity, WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import { useUpdateWork } from './useUpdateWork';
import { useWorkContribution } from './useWorkContribution';

const mapper = new WorkDtoMapper();

const defaultValues = getDefaultWork();

const useWork = (
  id: WorkId,
  queryToken: QueryToken,
  onCreateContributionCompleted?: (data: WorkContributionDto) => void,
) => {
  const {
    data = {
      work: defaultValues,
    },
  } = useSuspenseQuery(GET_WORK, { variables: { workId: id }, skip: id.length === 0 || isDefaultId(id) });
  const { deleteWork } = useDeleteWork({ queryToken });
  const { updateWork: updateWorkMutation } = useUpdateWork({
    workId: id,
    queryToken,
  });
  const {
    createContribution: createContributionMutation,
    deleteContribution,
    updateContribution: updateContributionMutation,
  } = useWorkContribution({
    queryToken,
    onCreateComplete: onCreateContributionCompleted,
  });

  const work = mapper.toEntity(data.work as WorkDto);

  const updateWork = (data: WorkEntity) => {
    updateWorkMutation(data);
  };

  const updateContribution = (data: WorkContribution) => {
    const dto = mapper.toDtoContribution(data);

    updateContributionMutation({
      variables: {
        data: { workId: id, ...dto },
      },
    });
  };

  const createContribution = (data: WorkContribution, workId = id) => {
    const dto = mapper.toDtoContribution(data);

    createContributionMutation({
      variables: { data: { workId, ...dto } },
    });
  };

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
