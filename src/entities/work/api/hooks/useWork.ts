'use client';

import { useSuspenseQuery } from '@apollo/client/react';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORK } from '../../model/work.schema';
import type { WorkDto, WorkId } from '../../model/work.types';

const mapper = new WorkDtoMapper();

const useWork = (id: WorkId) => {
  const { data } = useSuspenseQuery(GET_WORK, { variables: { workId: id } });

  const work = data?.work ? mapper.toEntity(data.work as WorkDto) : null;

  return {
    work,
  };
};

export default useWork;
