'use client';

import { useSuspenseQuery } from '@apollo/client/react';

import { QueryToken, WorkTypes } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORK } from '../../model/work.schema';
import type { WorkDto, WorkId } from '../../model/work.types';
import { useCreateWorkContribution } from './useCreaeteWorkContribution';
import useDeleteWork from './useDeleteWork';
import { useUpdateWork } from './useUpdateWork';

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
  const { createContribution } = useCreateWorkContribution({ workId: id, queryToken });

  const work = mapper.toEntity(data.work as WorkDto);

  return {
    work,
    deleteWork,
    updateWork,
    createContribution,
    toDto: mapper.toDto,
  };
};

export default useWork;
