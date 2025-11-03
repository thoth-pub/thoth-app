'use client';

import { useQuery } from '@apollo/client/react';

import type { WorkDto, WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { GET_WORK_CHAPTERS } from '../../model/work.schema';
import { useEffect, useRef, useState } from 'react';
import { WorkDtoMapper } from '../../model/work.mapper';
import { appConfig, WorkTypes } from '@/src/shared';

type UseChaptersProps = {
  workId: WorkId;
};

const mapper = new WorkDtoMapper();

const LIMIT = appConfig.data.itemsPerRequestLimit;

const useWorkChapters = (props: UseChaptersProps) => {
  const { workId = '' } = props;

  const uniqueChapters = useRef<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [chapters, setChapters] = useState<WorkEntity[]>([]);
  const {
    data: { work: { relations } = { relations: [] } } = { work: { relations: [] } },
    error,
    loading,
  } = useQuery(GET_WORK_CHAPTERS, {
    variables: { workId, limit: LIMIT, offset },
    skip: workId.length === 0,
  });

  useEffect(() => {
    if (relations.length === 0 || loading) return;

    const newData = relations.map((relation) => mapper.toEntity(relation.relatedWork as WorkDto));
    const filteredChapters = newData.filter(
      ({ type, id }) => type === WorkTypes.enum.BookChapter && !uniqueChapters.current.includes(id),
    );

    const newUniqueChapters: WorkEntity[] = [];

    filteredChapters.forEach((chapter) => {
      if (uniqueChapters.current.includes(chapter.id)) return;

      uniqueChapters.current.push(chapter.id);
      newUniqueChapters.push(chapter);
    });

    setChapters([...chapters, ...newUniqueChapters]);

    if (newData.length === LIMIT) {
      setOffset(offset + LIMIT);
    }
  }, [loading]);

  return { chapters, error, loading };
};

export default useWorkChapters;
