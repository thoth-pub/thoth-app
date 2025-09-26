'use client';

import { useSuspenseQuery } from '@apollo/client/react';

import { QueryToken, WorkTypes } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORK } from '../../model/work.schema';
import type { WorkDto, WorkEntity, WorkId } from '../../model/work.types';
import useDeleteWork from './useDeleteWork';
import { useUpdateWork } from './useUpdateWork';
import { useWorkContribution } from './useWorkContribution';

const mapper = new WorkDtoMapper();

const useWork = (id: WorkId, queryToken: QueryToken) => {
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
  } = useSuspenseQuery(GET_WORK, { variables: { workId: id } });
  const { deleteWork } = useDeleteWork({ workId: id, queryToken });
  const { updateWork } = useUpdateWork({ workId: id, queryToken });
  const { createContribution, deleteContribution, updateContribution } = useWorkContribution({
    workId: id,
    queryToken,
  });

  const work = mapper.toEntity(data.work as WorkDto);

  const updateWorkRef = (data: WorkEntity) => {
    const dto = mapper.toDto(data);

    updateWork({
      variables: {
        data: dto,
      },
    });
  };

  return {
    work,
    deleteWork,
    updateWork,
    updateWorkRef,
    createContribution,
    deleteContribution,
    updateContribution,
    toDto: mapper.toDto,
    contributionToDto: mapper.toDtoContribution,
  };
};

export default useWork;
