'use client';

import { useSuspenseQuery } from '@apollo/client/react';

import { isDefaultId, QueryToken, WorkTypes } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORK } from '../../model/work.schema';
import type { WorkContribution, WorkContributionDto, WorkDto, WorkEntity, WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import { useUpdateWork } from './useUpdateWork';
import { useWorkContribution } from './useWorkContribution';

const mapper = new WorkDtoMapper();

const useWork = (id: WorkId, queryToken: QueryToken, onCreateCompleted?: (data: WorkContributionDto) => void) => {
  const defaultValues = {
    workId: id,
    title: '',
    fullTitle: '',
    imprintId: '',
    workType: WorkTypes.enum.BookChapter,
  };
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
    workId: id,
    queryToken,
    onCreateComplete: onCreateCompleted,
  });

  const work = mapper.toEntity(data.work as WorkDto);

  const updateWork = (data: WorkEntity) => {
    const dto = mapper.toDto(data);

    updateWorkMutation({
      variables: {
        data: dto,
      },
    });
  };

  const updateContribution = (data: WorkContribution) => {
    const dto = mapper.toDtoContribution(data);

    updateContributionMutation({
      variables: {
        data: { workId: id, ...dto },
      },
    });
  };

  const createContribution = (data: WorkContribution) => {
    const dto = mapper.toDtoContribution(data);

    createContributionMutation({
      variables: { data: { workId: id, ...dto } },
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
